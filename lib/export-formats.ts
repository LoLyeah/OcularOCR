import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type { OcrBlock, OcrTable, StructuredOcrResult } from './storage';
import { normalizeStructuredOcrResult } from './structured-ocr';
import { tableToCsv, tableToMarkdown } from './table-extract';

function download(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function markdownBlock(block: OcrBlock): string {
  if (block.type === 'table' && block.table) return tableToMarkdown(block.table);
  if (block.type === 'heading') return `${'#'.repeat(Math.min(6, Math.max(1, block.level || 2)))} ${block.text.replace(/^#{1,6}\s+/, '')}`;
  if (block.type === 'list') {
    const marker = block.listStyle === 'ordered' ? '1.' : '-';
    return block.text.split('\n').map((line) => `${marker} ${line.replace(/^([-*+]|\d+[.)])\s+/, '')}`).join('\n');
  }
  return block.text;
}

export function structuredOcrToMarkdown(result: StructuredOcrResult): string {
  const normalized = normalizeStructuredOcrResult(result);
  return normalized.pages.map((page) => {
    const pageMarker = normalized.pages.length > 1 ? `<!-- Page ${page.pageNumber} -->\n\n` : '';
    return `${pageMarker}${(page.blocks || []).map(markdownBlock).filter(Boolean).join('\n\n')}`.trim();
  }).join('\n\n---\n\n');
}

function docxTable(table: OcrTable): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: table.rows.map((row, rowIndex) => new TableRow({
      tableHeader: rowIndex === 0,
      children: row.cells.map((cell) => new TableCell({
        columnSpan: Math.max(1, cell.colSpan || 1),
        rowSpan: Math.max(1, cell.rowSpan || 1),
        children: [new Paragraph({
          children: [new TextRun({ text: cell.text, bold: Boolean(cell.isHeader || rowIndex === 0) })],
        })],
      })),
    })),
  });
}

function docxBlock(block: OcrBlock): Paragraph | Table {
  if (block.type === 'table' && block.table) return docxTable(block.table);
  if (block.type === 'heading') {
    const levels = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6];
    return new Paragraph({ heading: levels[Math.min(5, Math.max(0, (block.level || 2) - 1))], children: [new TextRun(block.text.replace(/^#{1,6}\s+/, ''))] });
  }
  if (block.type === 'list') {
    return new Paragraph({
      ...(block.listStyle === 'ordered' ? { numbering: { reference: 'ocr-numbering', level: 0 } } : { bullet: { level: 0 } }),
      children: [new TextRun(block.text.replace(/^([-*+]|\d+[.)])\s+/, ''))],
    });
  }
  return new Paragraph({ children: [new TextRun(block.text)] });
}

export async function exportDocx(result: StructuredOcrResult, fileName: string): Promise<void> {
  const normalized = normalizeStructuredOcrResult(result);
  const children: Array<Paragraph | Table> = [];
  for (const page of normalized.pages) {
    if (normalized.pages.length > 1) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        pageBreakBefore: page.pageNumber > 1,
        children: [new TextRun({ text: `Page ${page.pageNumber}`, bold: true })],
      }));
    }
    children.push(...(page.blocks || []).map(docxBlock));
  }
  const doc = new Document({
    title: fileName.replace(/\.docx$/, ''),
    numbering: {
      config: [{
        reference: 'ocr-numbering',
        levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.START }],
      }],
    },
    sections: [{ children }],
  });
  download(await Packer.toBlob(doc), fileName.endsWith('.docx') ? fileName : `${fileName}.docx`);
}

export function exportMarkdown(result: StructuredOcrResult, fileName: string): void {
  download(new Blob([structuredOcrToMarkdown(result)], { type: 'text/markdown;charset=utf-8' }), fileName.replace(/\.md$/, '') + '.md');
}

export function exportTablesCsv(result: StructuredOcrResult, fileName: string): void {
  const normalized = normalizeStructuredOcrResult(result);
  const sections = normalized.pages.flatMap((page) => (page.tables || []).map((table, index) =>
    `Page ${page.pageNumber} - Table ${index + 1}\n${tableToCsv(table)}`
  ));
  download(new Blob([sections.join('\n\n')], { type: 'text/csv;charset=utf-8' }), fileName.replace(/\.csv$/, '') + '.csv');
}

export function exportJson(result: StructuredOcrResult, fileName: string): void {
  const json = JSON.stringify(normalizeStructuredOcrResult(result), null, 2);
  download(new Blob([json], { type: 'application/json' }), fileName.replace(/\.json$/, '') + '.json');
}
