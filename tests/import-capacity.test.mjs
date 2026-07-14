import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { assessLocalImportCapacity, LARGE_LOCAL_IMPORT_BYTES, REMOTE_IMPORT_LIMIT_BYTES } from '../lib/import-capacity.ts';

test('local imports are not bound to the remote 25 MB ceiling', () => {
  const result = assessLocalImportCapacity(REMOTE_IMPORT_LIMIT_BYTES * 2);
  assert.equal(result.allowed, true);
  assert.equal(result.warning, false);
});

test('large local imports warn but continue when storage is sufficient', () => {
  const result = assessLocalImportCapacity(LARGE_LOCAL_IMPORT_BYTES, 100 * 1024 * 1024, 2 * 1024 * 1024 * 1024);
  assert.equal(result.allowed, true);
  assert.equal(result.warning, true);
});

test('local imports stop before exhausting browser storage', () => {
  const result = assessLocalImportCapacity(200 * 1024 * 1024, 850 * 1024 * 1024, 1024 * 1024 * 1024);
  assert.equal(result.allowed, false);
  assert.equal(result.availableBytes, 174 * 1024 * 1024);
});

test('large PDF workflows render searchable export and comparisons one page at a time', () => {
  const viewer = readFileSync('components/document-viewer.tsx', 'utf8');
  const exporter = readFileSync('lib/pdf-export.ts', 'utf8');
  assert.doesNotMatch(viewer, /renderPdfToCanvas/);
  assert.match(viewer, /getSinglePageCanvas/);
  assert.match(exporter, /getPageCanvas: \(pageNumber: number\)/);
  assert.match(exporter, /canvas\.width = 0/);
});
