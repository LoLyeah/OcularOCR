import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { degrees, PDFDocument } from 'pdf-lib';

import {
  buildPdfFromPlan,
  deletePdfPages,
  movePdfPage,
  normalizeRotation,
  rotatePdfPages,
} from '../lib/pdf-workspace.ts';

async function createPdf(pageSizes, firstPageRotation = 0) {
  const pdf = await PDFDocument.create();
  pageSizes.forEach(([width, height], index) => {
    const page = pdf.addPage([width, height]);
    page.drawText(`Page ${index + 1}`);
    if (index === 0) page.setRotation(degrees(firstPageRotation));
  });
  const bytes = await pdf.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

test('page plan helpers reorder, rotate, and delete immutably', () => {
  const pages = [
    { id: 'a', sourceId: 'one', pageIndex: 0, rotation: 0 },
    { id: 'b', sourceId: 'one', pageIndex: 1, rotation: 0 },
    { id: 'c', sourceId: 'two', pageIndex: 0, rotation: 0 },
  ];
  assert.deepEqual(movePdfPage(pages, 2, 0).map(({ id }) => id), ['c', 'a', 'b']);
  assert.deepEqual(pages.map(({ id }) => id), ['a', 'b', 'c']);
  assert.equal(rotatePdfPages(pages, new Set(['b']), -90)[1].rotation, 270);
  assert.deepEqual(deletePdfPages(pages, new Set(['a', 'c'])).map(({ id }) => id), ['b']);
  assert.equal(normalizeRotation(450), 90);
});

test('PDF builder preserves source pages, order, duplication, and rotation', async () => {
  const first = await createPdf([[300, 500], [400, 600]], 90);
  const second = await createPdf([[700, 200]]);
  const output = await buildPdfFromPlan([
    { id: 'one', data: first },
    { id: 'two', data: second },
  ], [
    { id: 'c', sourceId: 'two', pageIndex: 0, rotation: 0 },
    { id: 'a', sourceId: 'one', pageIndex: 0, rotation: 90 },
    { id: 'a-copy', sourceId: 'one', pageIndex: 0, rotation: 0 },
  ]);

  const pdf = await PDFDocument.load(output);
  assert.equal(pdf.getPageCount(), 3);
  assert.deepEqual(pdf.getPage(0).getSize(), { width: 700, height: 200 });
  assert.equal(pdf.getPage(1).getRotation().angle, 180);
  assert.equal(pdf.getPage(2).getRotation().angle, 90);
});

test('PDF builder rejects empty and missing page plans', async () => {
  const source = await createPdf([[300, 500]]);
  await assert.rejects(() => buildPdfFromPlan([{ id: 'one', data: source }], []), /at least one/i);
  await assert.rejects(
    () => buildPdfFromPlan([{ id: 'one', data: source }], [{ id: 'x', sourceId: 'one', pageIndex: 2, rotation: 0 }]),
    /missing source page/i,
  );
});

test('PDF.js receives copies so decrypted source buffers remain reusable', () => {
  const source = readFileSync('lib/pdf.ts', 'utf8');
  assert.doesNotMatch(source, /new Uint8Array\(pdfData\)/);
  assert.equal(source.match(/new Uint8Array\(pdfData\.slice\(0\)\)/g)?.length, 4);
});
