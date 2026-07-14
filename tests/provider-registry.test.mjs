import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { PROVIDERS, resolveChatEndpoint, resolveModelsEndpoint, validateProviderEndpoint } from '../lib/providers.ts';

test('provider registry is the only runtime source for curated model examples', () => {
  const runtimeSources = ['lib/ai.ts', 'lib/tagger.ts', 'components/settings-modal.tsx', 'components/guide-content.tsx'];
  for (const provider of PROVIDERS) {
    for (const path of runtimeSources.slice(0, 3)) {
      assert.doesNotMatch(readFileSync(path, 'utf8'), new RegExp(provider.modelExample.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    assert.match(provider.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(provider.docsUrl, /^https:\/\//);
    assert.match(provider.modelsUrl, /^https:\/\//);
  }
});

test('provider endpoint helpers normalize chat and model discovery URLs', () => {
  assert.equal(resolveChatEndpoint({ provider: 'openai', endpoint: 'https://example.com/v1' }), 'https://example.com/v1/chat/completions');
  assert.equal(resolveModelsEndpoint({ provider: 'openai', endpoint: 'https://example.com/v1/chat/completions' }), 'https://example.com/v1/models');
  assert.equal(resolveModelsEndpoint({ provider: 'ollama', endpoint: '' }), 'http://localhost:11434/v1/models');
  assert.equal(validateProviderEndpoint({ provider: 'openai', endpoint: 'http://example.com/v1' }), 'Remote endpoints must use HTTPS.');
  assert.equal(validateProviderEndpoint({ provider: 'ollama', endpoint: 'http://localhost:11434/v1' }), null);
});

test('runtime and documentation do not contain retired duplicated defaults or proxy claims', () => {
  const paths = ['lib/ai.ts', 'lib/tagger.ts', 'components/settings-modal.tsx', 'components/guide-content.tsx', 'README.md'];
  const content = paths.map((path) => readFileSync(path, 'utf8')).join('\n');
  assert.doesNotMatch(content, /gpt-4o(?! Transcribe)/i);
  assert.doesNotMatch(content, /server-side proxy|secret proxy shield/i);
});
