import assert from 'node:assert/strict';
import test from 'node:test';

import { AIPrivacyError, assertAiRequestAllowed } from '../lib/ai-policy.ts';

const settings = (overrides = {}) => ({
  provider: 'gemini',
  apiKey: '',
  endpoint: '',
  model: '',
  ...overrides,
});

test('remote providers require explicit cloud consent', () => {
  assert.throws(
    () => assertAiRequestAllowed(settings()),
    (error) => error instanceof AIPrivacyError && /consent/i.test(error.message),
  );
  assert.doesNotThrow(() => assertAiRequestAllowed(settings({ cloudProcessingConsent: true })));
});

test('strict local-only mode blocks remote providers even with consent', () => {
  assert.throws(
    () => assertAiRequestAllowed(settings({ localOnlyMode: true, cloudProcessingConsent: true })),
    (error) => error instanceof AIPrivacyError && /local-only/i.test(error.message),
  );
});

test('loopback OpenAI-compatible and Ollama endpoints remain on-device', () => {
  assert.doesNotThrow(() => assertAiRequestAllowed(settings({
    provider: 'openai',
    endpoint: 'http://127.0.0.1:8080/v1/chat/completions',
    localOnlyMode: true,
  })));
  assert.doesNotThrow(() => assertAiRequestAllowed(settings({
    provider: 'ollama',
    endpoint: 'http://localhost:11434/v1/chat/completions',
    localOnlyMode: true,
  })));
  assert.doesNotThrow(() => assertAiRequestAllowed(settings({
    provider: 'ollama',
    endpoint: 'http://[::1]:11434/v1/chat/completions',
    localOnlyMode: true,
  })));
});
