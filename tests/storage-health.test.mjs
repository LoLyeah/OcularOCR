import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { calculateStorageRisk, formatStorageBytes } from '../lib/storage-health.ts';

test('storage risk escalates at warning and critical thresholds', () => {
  assert.equal(calculateStorageRisk(10, 100), 'healthy');
  assert.equal(calculateStorageRisk(80, 100), 'warning');
  assert.equal(calculateStorageRisk(94, 100), 'warning');
  assert.equal(calculateStorageRisk(95, 100), 'critical');
  assert.equal(calculateStorageRisk(0, 0), 'unknown');
  assert.equal(calculateStorageRisk(Number.NaN, 100), 'unknown');
});

test('storage sizes use compact deterministic units', () => {
  assert.equal(formatStorageBytes(0), '0 B');
  assert.equal(formatStorageBytes(1024), '1.00 KB');
  assert.equal(formatStorageBytes(10 * 1024 * 1024), '10.0 MB');
  assert.equal(formatStorageBytes(3 * 1024 * 1024 * 1024), '3.00 GB');
  assert.equal(formatStorageBytes(-1), '—');
});

test('error screens do not expose exception messages by default', () => {
  for (const path of ['app/error.tsx', 'app/global-error.tsx']) {
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /\{error\.message\}/);
    assert.match(source, /encrypted vault/i);
  }
});
