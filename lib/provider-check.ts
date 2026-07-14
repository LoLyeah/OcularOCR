import type { AISettings } from './storage';
import { resolveChatEndpoint, resolveModelsEndpoint, resolveProviderModel, validateProviderEndpoint } from './providers';

export type CapabilityState = 'verified' | 'unsupported' | 'untested';

export interface ProviderCheckResult {
  connected: boolean;
  modelFound: boolean;
  models: string[];
  capabilities: Record<'text' | 'vision' | 'structured', CapabilityState>;
  error?: string;
  checkedAt: string;
}

const TEST_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

function messageFromResponse(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const value = body as { error?: string | { message?: string }; message?: string };
    if (typeof value.error === 'string') return value.error;
    if (value.error?.message) return value.error.message;
    if (value.message) return value.message;
  }
  return `Provider returned HTTP ${status}.`;
}

async function fetchJson(url: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) });
  let body: unknown;
  try { body = await response.json(); } catch { body = undefined; }
  if (!response.ok) throw new Error(messageFromResponse(body, response.status));
  return body;
}

function authorizationHeaders(apiKey: string): Record<string, string> {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

async function discoverModels(settings: AISettings): Promise<string[]> {
  if (settings.provider === 'gemini') {
    const data = await fetchJson(`${resolveModelsEndpoint(settings)}?key=${encodeURIComponent(settings.apiKey)}`, { method: 'GET' }) as { models?: Array<{ name?: string; supportedGenerationMethods?: string[] }> };
    return (data.models || [])
      .filter((model) => model.supportedGenerationMethods?.includes('generateContent'))
      .map((model) => (model.name || '').replace(/^models\//, ''))
      .filter(Boolean);
  }
  const data = await fetchJson(resolveModelsEndpoint(settings), {
    method: 'GET',
    headers: authorizationHeaders(settings.apiKey),
  }) as { data?: Array<{ id?: string }>; models?: Array<{ name?: string; model?: string }> };
  return data.data?.map((model) => model.id || '').filter(Boolean)
    || data.models?.map((model) => model.model || model.name || '').filter(Boolean)
    || [];
}

async function testGemini(settings: AISettings, capability: 'text' | 'vision' | 'structured'): Promise<void> {
  const model = encodeURIComponent(resolveProviderModel(settings));
  const parts: Array<Record<string, unknown>> = [{ text: capability === 'structured' ? 'Return {"ok":true}.' : 'Reply with OK.' }];
  if (capability === 'vision') parts.push({ inlineData: { mimeType: 'image/png', data: TEST_IMAGE_BASE64 } });
  const body: Record<string, unknown> = { contents: [{ role: 'user', parts }] };
  if (capability === 'structured') {
    body.generationConfig = {
      responseMimeType: 'application/json',
      responseSchema: { type: 'OBJECT', properties: { ok: { type: 'BOOLEAN' } }, required: ['ok'] },
    };
  }
  const data = await fetchJson(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(settings.apiKey)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  if (capability === 'structured') {
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = JSON.parse(text) as { ok?: unknown };
    if (typeof parsed.ok !== 'boolean') throw new Error('Structured response did not match the test schema.');
  }
}

async function testCompatible(settings: AISettings, capability: 'text' | 'vision' | 'structured'): Promise<void> {
  const content: string | Array<Record<string, unknown>> = capability === 'vision'
    ? [{ type: 'text', text: 'Reply with OK.' }, { type: 'image_url', image_url: { url: `data:image/png;base64,${TEST_IMAGE_BASE64}` } }]
    : capability === 'structured' ? 'Return {"ok":true}.' : 'Reply with OK.';
  const body: Record<string, unknown> = {
    model: resolveProviderModel(settings),
    messages: [{ role: 'user', content }],
  };
  if (capability === 'structured') {
    body.response_format = {
      type: 'json_schema',
      json_schema: { name: 'ocularocr_check', strict: true, schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false } },
    };
  }
  const data = await fetchJson(resolveChatEndpoint(settings), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authorizationHeaders(settings.apiKey) },
    body: JSON.stringify(body),
  }) as { choices?: Array<{ message?: { content?: string } }> };
  if (capability === 'structured') {
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || '') as { ok?: unknown };
    if (typeof parsed.ok !== 'boolean') throw new Error('Structured response did not match the test schema.');
  }
}

export async function checkProvider(settings: AISettings): Promise<ProviderCheckResult> {
  const checkedAt = new Date().toISOString();
  const capabilities: ProviderCheckResult['capabilities'] = { text: 'untested', vision: 'untested', structured: 'untested' };
  const endpointError = validateProviderEndpoint(settings);
  if (endpointError) return { connected: false, modelFound: false, models: [], capabilities, error: endpointError, checkedAt };
  if (!resolveProviderModel(settings)) return { connected: false, modelFound: false, models: [], capabilities, error: 'Enter a model ID.', checkedAt };
  if (settings.provider !== 'ollama' && !settings.apiKey.trim()) return { connected: false, modelFound: false, models: [], capabilities, error: 'Enter an API key.', checkedAt };

  let models: string[] = [];
  try {
    models = await discoverModels(settings);
  } catch (error) {
    return { connected: false, modelFound: false, models, capabilities, error: error instanceof Error ? error.message : String(error), checkedAt };
  }

  const model = resolveProviderModel(settings);
  const modelFound = models.length === 0 || models.includes(model) || models.some((entry) => entry.split(':')[0] === model.split(':')[0]);
  if (!modelFound) return { connected: true, modelFound, models, capabilities, error: `Model “${model}” was not returned by this account or server.`, checkedAt };

  for (const capability of ['text', 'vision', 'structured'] as const) {
    try {
      if (settings.provider === 'gemini') await testGemini(settings, capability);
      else await testCompatible(settings, capability);
      capabilities[capability] = 'verified';
    } catch {
      capabilities[capability] = 'unsupported';
    }
  }
  return { connected: true, modelFound, models, capabilities, checkedAt };
}

export function assertProviderReadyForOcr(settings: AISettings, structured = false): void {
  const verification = settings.providerVerification;
  const endpoint = settings.provider === 'gemini' ? '' : resolveChatEndpoint(settings);
  const model = resolveProviderModel(settings);
  const matches = verification
    && verification.provider === settings.provider
    && verification.endpoint === endpoint
    && verification.model === model;
  if (!matches) throw new Error('Test this provider and model in Settings before using AI OCR. The check uses synthetic content only.');
  if (verification.capabilities.text !== 'verified' || verification.capabilities.vision !== 'verified') {
    throw new Error('The selected model did not pass the text and image-input checks required for AI OCR.');
  }
  if (structured && verification.capabilities.structured !== 'verified') {
    throw new StructuredOcrCapabilityError('The selected model did not pass the structured-output check. Disable structured AI OCR or choose another model.');
  }
}

export class StructuredOcrCapabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StructuredOcrCapabilityError';
  }
}
