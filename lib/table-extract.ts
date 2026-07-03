import { OcrWord } from '@/lib/storage';

export interface TableCell {
  text: string;
}

export interface TableRow {
  cells: TableCell[];
}

export interface DetectedTable {
  rows: TableRow[];
  pageNumber: number;
}

const ROW_THRESHOLD = 12;
const COL_THRESHOLD = 20;

export function detectTables(words: OcrWord[], pageWidth: number, pageHeight: number): DetectedTable[] {
  if (words.length === 0) return [];

  const sorted = [...words].sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);

  const rows: { y: number; words: OcrWord[] }[] = [];
  for (const w of sorted) {
    const midY = (w.bbox.y0 + w.bbox.y1) / 2;
    const existing = rows.find(r => Math.abs(r.y - midY) < ROW_THRESHOLD);
    if (existing) {
      existing.words.push(w);
    } else {
      rows.push({ y: midY, words: [w] });
    }
  }

  const MIN_TABLE_ROWS = 2;
  const MIN_TABLE_COLS = 2;
  const MIN_WORDS_PER_ROW = 2;

  const dataRows = rows.filter(r => r.words.length >= MIN_WORDS_PER_ROW);
  if (dataRows.length < MIN_TABLE_ROWS) return [];

  for (const row of dataRows) {
    row.words.sort((a, b) => a.bbox.x0 - b.bbox.x0);
  }

  const allXStarts = new Set<number>();
  for (const row of dataRows) {
    for (const w of row.words) {
      allXStarts.add(w.bbox.x0);
    }
  }
  const sortedCols = [...allXStarts].sort((a, b) => a - b);

  const mergedCols: number[] = [];
  for (const x of sortedCols) {
    const last = mergedCols[mergedCols.length - 1];
    if (last == null || x - last >= COL_THRESHOLD) {
      mergedCols.push(x);
    }
  }

  if (mergedCols.length < MIN_TABLE_COLS) return [];

  const tableRows: TableRow[] = [];
  for (const row of dataRows) {
    const cells: TableCell[] = [];
    for (let ci = 0; ci < mergedCols.length; ci++) {
      const colX = mergedCols[ci];
      const nextColX = ci + 1 < mergedCols.length ? mergedCols[ci + 1] : pageWidth;
      const cellWords = row.words.filter(
        w => w.bbox.x0 >= colX && w.bbox.x1 <= nextColX + COL_THRESHOLD
      );
      cellWords.sort((a, b) => a.bbox.x0 - b.bbox.x0);
      cells.push({ text: cellWords.map(cw => cw.text).join(' ').trim() });
    }
    tableRows.push({ cells });
  }

  return [{
    rows: tableRows,
    pageNumber: 1,
  }];
}

export function tableToCsv(table: DetectedTable): string {
  const lines = table.rows.map(row =>
    row.cells.map(c => `"${c.text.replace(/"/g, '""')}"`).join(',')
  );
  return lines.join('\n');
}

export function tableToMarkdown(table: DetectedTable): string {
  if (table.rows.length === 0) return '';
  const colCount = table.rows[0].cells.length;
  const header = `| ${table.rows[0].cells.map(c => c.text).join(' | ')} |`;
  const separator = `| ${Array(colCount).fill('---').join(' | ')} |`;
  const body = table.rows.slice(1).map(
    row => `| ${row.cells.map(c => c.text).join(' | ')} |`
  ).join('\n');
  return [header, separator, body].join('\n');
}