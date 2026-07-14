import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { getPlatformReadiness } from '../lib/platform.ts';
import { recommendedOcrWorkers } from '../lib/performance.ts';
import { compareVersions, isNewerVersion } from '../lib/version.ts';

test('semantic release comparison ignores older and equal server versions', () => {
  assert.equal(compareVersions('1.0.0', '0.22.0'), 1);
  assert.equal(compareVersions('1.0', '1.0.0'), 0);
  assert.equal(isNewerVersion('0.22.0', '1.0.0'), false);
  assert.equal(isNewerVersion('1.0.1', '1.0.0'), true);
});

test('OCR concurrency protects mobile and memory-constrained devices', () => {
  assert.equal(recommendedOcrWorkers(8, 8, true), 1);
  assert.equal(recommendedOcrWorkers(8, 2, false), 1);
  assert.equal(recommendedOcrWorkers(4, 4, false), 2);
  assert.equal(recommendedOcrWorkers(12, 16, false), 4);
});

test('platform preflight reports missing required browser capabilities', () => {
  const unsupported = getPlatformReadiness({});
  assert.equal(unsupported.supported, false);
  for (const feature of ['IndexedDB', 'Web Crypto', 'WebAssembly', 'Web Workers']) assert.ok(unsupported.missing.includes(feature));
});

test('new vaults offer confirmed encryption or an explicitly warned no-password mode', () => {
  const source = readFileSync('components/vault-setup.tsx', 'utf8');
  assert.match(source, /password !== confirmPassword/);
  assert.match(source, /mode === 'unencrypted'/);
  assert.match(source, /handleSetupUnencrypted/);
  assert.match(source, /localStorage\.setItem\('vault_mode', 'unencrypted'\)/);
  assert.match(readFileSync('lib/i18n.tsx', 'utf8'), /do not use it for sensitive documents or API keys/);
  assert.match(readFileSync('components/dashboard.tsx', 'utf8'), /localNoPassword/);
  assert.match(readFileSync('components/file-manager.tsx', 'utf8'), /noPasswordStorageBadge/);
});

test('production configuration ships baseline browser security headers', () => {
  const config = readFileSync('next.config.ts', 'utf8');
  for (const header of ['Content-Security-Policy', 'Referrer-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Cross-Origin-Opener-Policy', 'Permissions-Policy']) assert.match(config, new RegExp(header));
  assert.match(config, /frame-ancestors 'none'/);
  assert.match(config, /object-src 'none'/);
});

test('PWA metadata and release documentation cover stable-launch requirements', () => {
  const manifest = JSON.parse(readFileSync('public/manifest.json', 'utf8'));
  assert.equal(manifest.id, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.orientation, 'any');
  assert.equal(manifest.display, 'standalone');
  assert.match(readFileSync('public/sw.js', 'utf8'), /ocular-app-cache-.*v4/s);
  assert.match(readFileSync('RELEASE_NOTES.md', 'utf8'), /Complete workflow/);
  assert.match(readFileSync('docs/RELEASE_CHECKLIST.md', 'utf8'), /Manual release operation/);
});

test('backup UI rejects oversized files before reading them into memory', () => {
  const settings = readFileSync('components/settings-modal.tsx', 'utf8');
  const sizeCheck = settings.indexOf('file.size > MAX_BACKUP_IMPORT_BYTES');
  const read = settings.indexOf('await file.text()', sizeCheck);
  assert.ok(sizeCheck >= 0 && read > sizeCheck);
});
