import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const BUNDLED_LANGUAGES = new Set(['eng', 'ind']);
const DOWNLOADABLE_LANGUAGES = new Set(['spa', 'fra', 'deu', 'chi_sim', 'jpn', 'ara', 'hin']);

export async function GET(request: NextRequest, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  const match = /^([a-z_]+)\.traineddata\.gz$/.exec(file);
  const code = match?.[1];
  if (!code || (!BUNDLED_LANGUAGES.has(code) && !DOWNLOADABLE_LANGUAGES.has(code))) {
    return NextResponse.json({ error: 'Unsupported OCR language pack.' }, { status: 404 });
  }

  if (BUNDLED_LANGUAGES.has(code)) {
    return NextResponse.redirect(new URL(`/tessdata/${file}`, request.url), 307);
  }

  try {
    const upstream = await fetch(
      `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${code}/4.0.0_best_int/${code}.traineddata.gz`,
      { cache: 'no-store' },
    );
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: 'Language pack is temporarily unavailable.' }, { status: 502 });
    }
    return new NextResponse(upstream.body, {
      headers: {
        'Content-Type': 'application/gzip',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Language pack download failed.' }, { status: 502 });
  }
}
