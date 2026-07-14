import type { OcrBlock, OcrTable, OcrTableCell, OcrWord } from './storage';

export type DetectedTable = OcrTable;

function plainText(table: OcrTable): string {
  return table.rows.map((row) => row.cells.map((cell) => cell.text).join('\t')).join('\n');
}

interface WordRow {
  y: number;
  height: number;
  words: OcrWord[];
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function groupRows(words: OcrWord[]): WordRow[] {
  const heights = words.map((word) => Math.max(1, word.bbox.y1 - word.bbox.y0));
  const tolerance = Math.max(4, median(heights) * 0.65);
  const rows: WordRow[] = [];
  for (const word of [...words].sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0)) {
    const y = (word.bbox.y0 + word.bbox.y1) / 2;
    const existing = rows.find((row) => Math.abs(row.y - y) <= tolerance);
    if (existing) {
      existing.words.push(word);
      existing.y = existing.words.reduce((sum, item) => sum + (item.bbox.y0 + item.bbox.y1) / 2, 0) / existing.words.length;
      existing.height = Math.max(existing.height, word.bbox.y1 - word.bbox.y0);
    } else {
      rows.push({ y, height: word.bbox.y1 - word.bbox.y0, words: [word] });
    }
  }
  return rows.sort((a, b) => a.y - b.y).map((row) => ({ ...row, words: row.words.sort((a, b) => a.bbox.x0 - b.bbox.x0) }));
}

function splitCandidates(rows: WordRow[]): WordRow[][] {
  const typicalHeight = Math.max(8, median(rows.map((row) => row.height)));
  const groups: WordRow[][] = [];
  let current: WordRow[] = [];
  for (const row of rows) {
    if (row.words.length < 2) {
      if (current.length >= 2) groups.push(current);
      current = [];
      continue;
    }
    const previous = current[current.length - 1];
    if (previous && row.y - previous.y > typicalHeight * 2.4) {
      if (current.length >= 2) groups.push(current);
      current = [];
    }
    current.push(row);
  }
  if (current.length >= 2) groups.push(current);
  return groups;
}

function clusterColumns(rows: WordRow[], pageWidth: number): number[] {
  const tolerance = Math.max(12, pageWidth * 0.025);
  const columns: number[] = [];
  for (const word of rows.flatMap((row) => row.words)) {
    const match = columns.findIndex((x) => Math.abs(x - word.bbox.x0) <= tolerance);
    if (match >= 0) columns[match] = (columns[match] + word.bbox.x0) / 2;
    else columns.push(word.bbox.x0);
  }
  return columns.sort((a, b) => a - b);
}

function rowCells(row: WordRow, columns: number[], pageWidth: number): OcrTableCell[] {
  const tolerance = Math.max(12, pageWidth * 0.025);
  return columns.map((column, index) => {
    const next = columns[index + 1] ?? pageWidth;
    const words = row.words.filter((word) => word.bbox.x0 >= column - tolerance && word.bbox.x0 < next - tolerance);
    if (words.length === 0) return { text: '' };
    return {
      text: words.map((word) => word.text).join(' ').trim(),
      bbox: {
        x0: Math.min(...words.map((word) => word.bbox.x0)),
        y0: Math.min(...words.map((word) => word.bbox.y0)),
        x1: Math.max(...words.map((word) => word.bbox.x1)),
        y1: Math.max(...words.map((word) => word.bbox.y1)),
      },
      confidence: median(words.map((word) => word.confidence).filter((value): value is number => typeof value === 'number')) || undefined,
    };
  });
}

export function detectTables(words: OcrWord[], pageWidth: number, _pageHeight: number, pageNumber = 1): DetectedTable[] {
  if (words.length < 4 || pageWidth <= 0) return [];
  const tables: OcrTable[] = [];
  for (const candidate of splitCandidates(groupRows(words))) {
    const columns = clusterColumns(candidate, pageWidth);
    if (columns.length < 2) continue;
    const rows = candidate.map((row) => ({ cells: rowCells(row, columns, pageWidth) }));
    const populatedRows = rows.filter((row) => row.cells.filter((cell) => cell.text).length >= 2);
    if (populatedRows.length < 2) continue;
    const supportedColumns = columns.filter((_, columnIndex) => populatedRows.filter((row) => Boolean(row.cells[columnIndex]?.text)).length >= 2);
    const populatedCellCount = populatedRows.reduce((count, row) => count + row.cells.filter((cell) => cell.text).length, 0);
    const density = populatedCellCount / (populatedRows.length * columns.length);
    if (supportedColumns.length < 2 || density < 0.45) continue;
    const firstRow = populatedRows[0];
    firstRow.cells = firstRow.cells.map((cell) => ({ ...cell, isHeader: true }));
    const allWords = candidate.flatMap((row) => row.words);
    tables.push({
      id: `page-${pageNumber}-table-${tables.length + 1}`,
      pageNumber,
      rows: populatedRows,
      bbox: {
        x0: Math.min(...allWords.map((word) => word.bbox.x0)),
        y0: Math.min(...allWords.map((word) => word.bbox.y0)),
        x1: Math.max(...allWords.map((word) => word.bbox.x1)),
        y1: Math.max(...allWords.map((word) => word.bbox.y1)),
      },
      confidence: median(allWords.map((word) => word.confidence).filter((value): value is number => typeof value === 'number')) || undefined,
      source: 'offline',
    });
  }
  return tables;
}

export function tableToCsv(table: DetectedTable): string {
  return table.rows.map((row) => row.cells.flatMap((cell) => [cell, ...Array(Math.max(0, (cell.colSpan || 1) - 1)).fill({ text: '' })]).map((cell) => `"${cell.text.replace(/"/g, '""')}"`).join(',')).join('\n');
}

function escapeMarkdownCell(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

export function tableToMarkdown(table: DetectedTable): string {
  if (table.rows.length === 0) return '';
  const expanded = table.rows.map((row) => row.cells.flatMap((cell) => [cell, ...Array(Math.max(0, (cell.colSpan || 1) - 1)).fill({ text: '' })]));
  const width = Math.max(...expanded.map((row) => row.length));
  const normalized = expanded.map((row) => Array.from({ length: width }, (_, index) => row[index] || { text: '' }));
  const header = `| ${normalized[0].map((cell) => escapeMarkdownCell(cell.text)).join(' | ')} |`;
  const separator = `| ${Array(width).fill('---').join(' | ')} |`;
  const body = normalized.slice(1).map((row) => `| ${row.map((cell) => escapeMarkdownCell(cell.text)).join(' | ')} |`).join('\n');
  return [header, separator, body].filter(Boolean).join('\n');
}

export function tableAsBlock(table: OcrTable, index: number): OcrBlock {
  return {
    id: `${table.id}-block-${index + 1}`,
    type: 'table',
    text: plainText(table),
    bbox: table.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
    table,
    confidence: table.confidence,
  };
}
