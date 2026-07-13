import type { AISettings } from './storage';

export class AIPrivacyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIPrivacyError';
  }
}

function isLoopbackEndpoint(settings: AISettings): boolean {
  if (settings.provider === 'gemini') return false;
  const fallback = settings.provider === 'ollama'
    ? 'http://localhost:11434/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';
  try {
    const hostname = new URL(settings.endpoint || fallback).hostname.toLowerCase().replace(/^\[|\]$/g, '');
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}

export function assertAiRequestAllowed(settings: AISettings): void {
  const isOnDevice = isLoopbackEndpoint(settings);
  if (settings.localOnlyMode && !isOnDevice) {
    throw new AIPrivacyError('Local-only mode blocked this request because the selected AI endpoint is not running on this device.');
  }
  if (!isOnDevice && !settings.cloudProcessingConsent) {
    throw new AIPrivacyError('Cloud processing consent is required before document content can be sent to this AI provider. Enable consent in Settings → AI Processing.');
  }
}
