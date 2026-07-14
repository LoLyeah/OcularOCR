import type { AISettings } from './storage';
import { isLoopbackProvider } from './providers.ts';

export class AIPrivacyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIPrivacyError';
  }
}

export function assertAiRequestAllowed(settings: AISettings): void {
  const isOnDevice = isLoopbackProvider(settings);
  if (settings.localOnlyMode && !isOnDevice) {
    throw new AIPrivacyError('Local-only mode blocked this request because the selected AI endpoint is not running on this device.');
  }
  if (!isOnDevice && !settings.cloudProcessingConsent) {
    throw new AIPrivacyError('Cloud processing consent is required before document content can be sent to this AI provider. Enable consent in Settings → AI Processing.');
  }
}
