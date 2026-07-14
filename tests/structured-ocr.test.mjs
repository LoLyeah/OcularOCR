import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  normalizeStructuredOcrResult,
  replacePageBlocks,
  STRUCTURED_OCR_VERSION,
} from '../lib/structured-ocr.ts';
import { detectTables, tableToCsv, tableToMarkdown } from '../lib/table-extract.ts';

test('legacy OCR results migrate to versioned blocks without rescanning', () => {
  const migrated = normalizeStructuredOcrResult({
    text: 'Title\nBody',
    pages: [{ pageNumber: 1, text: '# Title\nBody', words: [] }],
  });
  assert.equal(migrated.version, STRUCTURED_OCR_VERSION);
  assert.equal(migrated.pages[0].blocks.length, 2);
  assert.equal(migrated.pages[0].blocks[0].type, 'heading');
  assert.equal(migrated.pages[0].blocks[0].level, 1);
  assert.equal(migrated.pages[0].blocks[1].type, 'text');
});

test('table structure survives normalization and user correction', () => {
  const result = normalizeStructuredOcrResult({
    pages: [{
      pageNumber: 2,
      text: '',
      words: [],
      blocks: [{
        type: 'table',
        text: '',
        bbox: { x0: 0, y0: 0, x1: 100, y1: 80 },
        table: {
          rows: [
            { cells: [{ text: 'Name', isHeader: true }, { text: 'Amount', isHeader: true }] },
            { cells: [{ text: 'A' }, { text: '10' }] },
          ],
        },
      }],
    }],
  });
  assert.equal(result.pages[0].tables.length, 1);
  assert.equal(result.pages[0].tables[0].rows[1].cells[1].text, '10');

  const corrected = replacePageBlocks(result, 2, result.pages[0].blocks.map((block) => ({ ...block, table: block.table ? { ...block.table, source: 'user', rows: [block.table.rows[0], { cells: [{ text: 'A' }, { text: '12' }] }] } : undefined })));
  assert.equal(corrected.pages[0].tables[0].rows[1].cells[1].text, '12');
  assert.equal(corrected.pages[0].tables[0].source, 'user');
});

test('offline word geometry detects separate aligned tables', () => {
  const word = (text, x0, y0) => ({ text, bbox: { x0, y0, x1: x0 + 40, y1: y0 + 12 }, confidence: 90 });
  const tables = detectTables([
    word('Item', 20, 20), word('Price', 180, 20),
    word('Pen', 20, 42), word('2', 180, 42),
    word('Notes', 20, 100),
    word('Name', 20, 160), word('Score', 180, 160),
    word('Ada', 20, 182), word('9', 180, 182),
  ], 400, 240, 3);
  assert.equal(tables.length, 2);
  assert.equal(tables[0].pageNumber, 3);
  assert.equal(tables[1].rows[1].cells[0].text, 'Ada');
});

test('table exports escape Markdown and quote CSV safely', () => {
  const table = {
    id: 'table-1',
    pageNumber: 1,
    rows: [
      { cells: [{ text: 'Name', isHeader: true }, { text: 'Notes', isHeader: true }] },
      { cells: [{ text: 'A|B' }, { text: 'said "yes"\nagain' }] },
    ],
  };
  assert.match(tableToMarkdown(table), /A\\\|B/);
  assert.match(tableToMarkdown(table), /said "yes"<br>again/);
  assert.match(tableToCsv(table), /"said ""yes""\nagain"/);
});

test('merged columns remain aligned in flat export formats', () => {
  const table = {
    id: 'merged',
    pageNumber: 1,
    rows: [
      { cells: [{ text: 'Combined heading', isHeader: true, colSpan: 2 }] },
      { cells: [{ text: 'Left' }, { text: 'Right' }] },
    ],
  };
  assert.match(tableToMarkdown(table), /^\| Combined heading \|  \|/);
  assert.match(tableToCsv(table), /^"Combined heading",""/);
});

test('all rich exporters consume the shared structure', () => {
  const formats = readFileSync('lib/export-formats.ts', 'utf8');
  const pdf = readFileSync('lib/pdf-export.ts', 'utf8');
  const viewer = readFileSync('components/document-viewer.tsx', 'utf8');
  for (const name of ['structuredOcrToMarkdown', 'exportDocx', 'exportTablesCsv', 'exportJson']) assert.match(formats, new RegExp(name));
  assert.match(pdf, /drawTable/);
  assert.match(pdf, /drawBlock/);
  assert.match(viewer, /StructureEditor/);
  assert.match(viewer, /saveStructureChanges/);
  assert.match(viewer, /Cancel OCR/);
});
