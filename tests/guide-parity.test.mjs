import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('English and Indonesian guides use one structurally equivalent article map', () => {
  const english = readFileSync('components/guide.tsx', 'utf8');
  const indonesian = readFileSync('components/guide-id.tsx', 'utf8');
  assert.match(english, /<GuideContent locale="en"/);
  assert.match(indonesian, /<GuideContent locale="id"/);

  const shared = readFileSync('components/guide-content.tsx', 'utf8');
  for (const id of ['start', 'ocr', 'structure', 'export', 'providers', 'recovery', 'faq']) {
    assert.match(shared, new RegExp(`${id}:`));
  }
});

test('guide and README external links are secure and provider sources are official', () => {
  const content = `${readFileSync('components/guide-content.tsx', 'utf8')}\n${readFileSync('README.md', 'utf8')}`;
  assert.doesNotMatch(content, /href=["']http:\/\//);
  for (const host of ['developers.openai.com', 'ai.google.dev', 'docs.ollama.com']) assert.match(content, new RegExp(host.replace('.', '\\.')));
});
