import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { NextRequest, NextResponse } from 'next/server';
import { detectSupportedType, isPrivateIp } from '@/lib/proxy-security';

export const runtime = 'nodejs';

const MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 4;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 15;

const requestLog = new Map<string, number[]>();

async function assertPublicUrl(url: URL): Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS URLs are supported.');
  }
  if (url.username || url.password) {
    throw new Error('URLs containing credentials are not allowed.');
  }
  if (url.port && url.port !== '80' && url.port !== '443') {
    throw new Error('Only standard HTTP and HTTPS ports are allowed.');
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new Error('Local and private network URLs are not allowed.');
  }

  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error('Local and private network URLs are not allowed.');
    return;
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new Error('The URL resolves to a local or private network address.');
  }
}

function checkRateLimit(req: NextRequest): boolean {
  const client = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const now = Date.now();
  const recent = (requestLog.get(client) || []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_REQUESTS) return false;
  recent.push(now);
  requestLog.set(client, recent);
  if (requestLog.size > 10_000) {
    for (const [key, timestamps] of requestLog) {
      if (timestamps.every((timestamp) => now - timestamp >= RATE_LIMIT_WINDOW_MS)) requestLog.delete(key);
    }
  }
  return true;
}

async function fetchPublicFile(initialUrl: URL, signal: AbortSignal): Promise<Response> {
  let currentUrl = initialUrl;
  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    await assertPublicUrl(currentUrl);
    const response = await fetch(currentUrl, {
      redirect: 'manual',
      signal,
      headers: { 'User-Agent': 'OcularOCR/1.0 document importer' },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('The remote server returned an invalid redirect.');
      if (redirectCount === MAX_REDIRECTS) throw new Error('The remote server redirected too many times.');
      currentUrl = new URL(location, currentUrl);
      continue;
    }
    return response;
  }
  throw new Error('Unable to download the requested file.');
}

async function readLimitedBody(response: Response): Promise<Uint8Array> {
  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (declaredLength > MAX_DOWNLOAD_BYTES) throw new Error('The remote file exceeds the 25 MB import limit.');
  if (!response.body) throw new Error('The remote server returned an empty response.');

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_DOWNLOAD_BYTES) {
      await reader.cancel();
      throw new Error('The remote file exceeds the 25 MB import limit.');
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function GET(req: NextRequest) {
  if (!checkRateLimit(req)) {
    return NextResponse.json({ error: 'Too many URL import requests. Please try again shortly.' }, { status: 429 });
  }

  const urlParam = req.nextUrl.searchParams.get('url');
  if (!urlParam) return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetchPublicFile(new URL(urlParam), controller.signal);
      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch file: ${response.status} ${response.statusText}` },
          { status: response.status >= 400 && response.status < 500 ? response.status : 502 },
        );
      }

      const bytes = await readLimitedBody(response);
      const contentType = detectSupportedType(bytes);
      if (!contentType) {
        return NextResponse.json({ error: 'The URL does not contain a supported PDF, PNG, JPEG, or WebP file.' }, { status: 415 });
      }

      const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      return new NextResponse(body, {
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(bytes.byteLength),
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to download the specified URL';
    const status = err instanceof Error && err.name === 'AbortError'
      ? 504
      : message.includes('25 MB') ? 413 : message.includes('supported') ? 415 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
