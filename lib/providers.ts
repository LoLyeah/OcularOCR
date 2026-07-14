import type { AISettings } from './storage';

export type ProviderId = AISettings['provider'];
export type ProviderCapability = 'text' | 'vision' | 'structured';

export interface ProviderDefinition {
  id: ProviderId;
  name: string;
  kind: 'cloud' | 'local' | 'compatible';
  summary: string;
  defaultEndpoint: string;
  modelExample: string;
  modelExampleLabel: string;
  reviewedAt: string;
  docsUrl: string;
  modelsUrl: string;
  discovery: 'gemini' | 'openai' | 'ollama';
  requiresApiKey: boolean;
}

export const PROVIDER_REVIEW_DATE = '2026-07-14';

export const PROVIDER_REGISTRY: Record<ProviderId, ProviderDefinition> = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    kind: 'cloud',
    summary: 'Remote Gemini API. Page images and extracted text leave this device when an AI task runs.',
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta',
    modelExample: 'gemini-3.5-flash',
    modelExampleLabel: 'Stable multimodal example',
    reviewedAt: PROVIDER_REVIEW_DATE,
    docsUrl: 'https://ai.google.dev/gemini-api/docs',
    modelsUrl: 'https://ai.google.dev/gemini-api/docs/models',
    discovery: 'gemini',
    requiresApiKey: true,
  },
  openai: {
    id: 'openai',
    name: 'OpenAI-compatible',
    kind: 'compatible',
    summary: 'OpenAI or another compatible endpoint. Privacy and capabilities depend on the endpoint you enter.',
    defaultEndpoint: 'https://api.openai.com/v1/chat/completions',
    modelExample: 'gpt-5.6-luna',
    modelExampleLabel: 'OpenAI cost-sensitive multimodal example',
    reviewedAt: PROVIDER_REVIEW_DATE,
    docsUrl: 'https://developers.openai.com/api/docs',
    modelsUrl: 'https://developers.openai.com/api/docs/models',
    discovery: 'openai',
    requiresApiKey: true,
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama on this device',
    kind: 'local',
    summary: 'Local Ollama server. Choose an installed vision model for AI OCR and table extraction.',
    defaultEndpoint: 'http://localhost:11434/v1/chat/completions',
    modelExample: 'gemma3',
    modelExampleLabel: 'Example only; use an installed vision model',
    reviewedAt: PROVIDER_REVIEW_DATE,
    docsUrl: 'https://docs.ollama.com',
    modelsUrl: 'https://ollama.com/search?c=vision',
    discovery: 'ollama',
    requiresApiKey: false,
  },
};

export const PROVIDERS = Object.values(PROVIDER_REGISTRY);

export function getProvider(provider: ProviderId): ProviderDefinition {
  return PROVIDER_REGISTRY[provider];
}

export function resolveProviderModel(settings: Pick<AISettings, 'provider' | 'model'>): string {
  return settings.model.trim() || getProvider(settings.provider).modelExample;
}

export function resolveChatEndpoint(settings: Pick<AISettings, 'provider' | 'endpoint'>): string {
  if (settings.provider === 'gemini') return getProvider('gemini').defaultEndpoint;
  let endpoint = settings.endpoint.trim() || getProvider(settings.provider).defaultEndpoint;
  endpoint = endpoint.replace(/\/+$/, '');
  if (!/\/(chat\/completions|completions)$/.test(endpoint)) endpoint += '/chat/completions';
  return endpoint;
}

export function resolveModelsEndpoint(settings: Pick<AISettings, 'provider' | 'endpoint'>): string {
  if (settings.provider === 'gemini') return `${getProvider('gemini').defaultEndpoint}/models`;
  const chatEndpoint = resolveChatEndpoint(settings);
  return chatEndpoint.replace(/\/(chat\/completions|completions)$/, '/models');
}

export function isLoopbackProvider(settings: Pick<AISettings, 'provider' | 'endpoint'>): boolean {
  if (settings.provider === 'gemini') return false;
  try {
    const hostname = new URL(resolveChatEndpoint(settings)).hostname.toLowerCase().replace(/^\[|\]$/g, '');
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}

export function validateProviderEndpoint(settings: Pick<AISettings, 'provider' | 'endpoint'>): string | null {
  if (settings.provider === 'gemini') return null;
  try {
    const url = new URL(resolveChatEndpoint(settings));
    if (!['http:', 'https:'].includes(url.protocol)) return 'Use an HTTP or HTTPS endpoint.';
    if (!isLoopbackProvider(settings) && url.protocol !== 'https:') return 'Remote endpoints must use HTTPS.';
    return null;
  } catch {
    return 'Enter a valid endpoint URL.';
  }
}
