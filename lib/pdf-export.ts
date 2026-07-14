import { jsPDF } from 'jspdf';
import { StructuredOcrResult, OcrWord, type OcrBlock, type OcrTable } from './storage';
import { normalizeStructuredOcrResult } from './structured-ocr';

const ROW_THRESHOLD = 12;

interface GroupedLine {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  text: string;
}

function groupWordsIntoLines(words: OcrWord[]): GroupedLine[] {
  if (words.length === 0) return [];
  const sorted = [...words].sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);

  const rows: { yMid: number; y0: number; y1: number; words: OcrWord[] }[] = [];
  for (const w of sorted) {
    const midY = (w.bbox.y0 + w.bbox.y1) / 2;
    const existing = rows.find(r => Math.abs(r.yMid - midY) < ROW_THRESHOLD);
    if (existing) {
      existing.words.push(w);
      existing.y0 = Math.min(existing.y0, w.bbox.y0);
      existing.y1 = Math.max(existing.y1, w.bbox.y1);
    } else {
      rows.push({ yMid: midY, y0: w.bbox.y0, y1: w.bbox.y1, words: [w] });
    }
  }

  return rows.map(row => {
    row.words.sort((a, b) => a.bbox.x0 - b.bbox.x0);
    const gap = 5;
    let text = '';
    for (let i = 0; i < row.words.length; i++) {
      if (i > 0) {
        const prevEnd = row.words[i - 1].bbox.x1;
        const space = row.words[i].bbox.x0 - prevEnd;
        text += space > gap ? '  ' : ' ';
      }
      text += row.words[i].text;
    }
    return {
      x0: row.words[0].bbox.x0,
      y0: row.y0,
      x1: row.words[row.words.length - 1].bbox.x1,
      y1: row.y1,
      text
    };
  });
}

interface ExportSearchablePDFOptions {
  fileName: string;
  pageCount: number;
  getPageCanvas: (pageNumber: number) => Promise<HTMLCanvasElement>;
  structuredOcr: StructuredOcrResult;
}

export async function exportSearchablePDF({
  fileName,
  pageCount,
  getPageCanvas,
  structuredOcr
}: ExportSearchablePDFOptions): Promise<void> {
  if (pageCount < 1) {
    throw new Error('No pages available to export.');
  }

  let firstCanvas: HTMLCanvasElement | null = await getPageCanvas(1);
  const pdf = new jsPDF({
    orientation: firstCanvas.width > firstCanvas.height ? 'l' : 'p',
    unit: 'pt',
    format: [firstCanvas.width, firstCanvas.height],
    compress: true
  });

  for (let i = 0; i < pageCount; i++) {
    const canvas = i === 0 ? firstCanvas : await getPageCanvas(i + 1);
    if (!canvas) throw new Error(`Unable to render page ${i + 1}.`);
    const width = canvas.width;
    const height = canvas.height;

    if (i > 0) {
      pdf.addPage([width, height], width > height ? 'l' : 'p');
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, width, height, undefined, 'FAST');

    const pageNumber = i + 1;
    const pageData = structuredOcr.pages?.find(p => p.pageNumber === pageNumber);

    if (pageData && pageData.words && pageData.words.length > 0) {
      pdf.setFont('helvetica', 'normal');

      const lines = groupWordsIntoLines(pageData.words);
      for (const line of lines) {
        if (!line.text.trim()) continue;
        const lineHeight = line.y1 - line.y0;
        if (lineHeight <= 0) continue;

        const fontSize = Math.max(4, lineHeight);
        pdf.setFontSize(fontSize);
        pdf.text(line.text, line.x0, line.y1, {
          renderingMode: 'invisible'
        });
      }
    }
    canvas.width = 0;
    canvas.height = 0;
    if (i === 0) firstCanvas = null;
  }

  pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}

interface ExportReflowedPDFOptions {
  fileName: string;
  structuredOcr: StructuredOcrResult;
}

export function buildReflowedPdf(structuredOcr: StructuredOcrResult): jsPDF {
  const normalized = normalizeStructuredOcrResult(structuredOcr);
  const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'letter', compress: true });
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 54;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const newPage = () => {
    pdf.addPage('letter', 'p');
    y = margin;
  };
  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - margin) newPage();
  };
  const drawText = (text: string, options: { size?: number; bold?: boolean; indent?: number; prefix?: string } = {}) => {
    const size = options.size || 11;
    const indent = options.indent || 0;
    pdf.setFont('helvetica', options.bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    pdf.setTextColor(20, 23, 31);
    const prefix = options.prefix || '';
    const lines: string[] = pdf.splitTextToSize(`${prefix}${text}`, contentWidth - indent);
    const lineHeight = size * 1.35;
    for (const line of lines) {
      ensureSpace(lineHeight);
      pdf.text(line, margin + indent, y);
      y += lineHeight;
    }
    y += Math.max(4, size * 0.35);
  };
  const drawTable = (table: OcrTable) => {
    if (table.rows.length === 0) return;
    const columnCount = Math.max(...table.rows.map((row) => row.cells.reduce((count, cell) => count + Math.max(1, cell.colSpan || 1), 0)));
    const columnWidth = contentWidth / Math.max(1, columnCount);
    const padding = 5;
    const header = table.rows[0];
    const drawRow = (row: OcrTable['rows'][number], isHeader: boolean) => {
      pdf.setFont('helvetica', isHeader ? 'bold' : 'normal');
      pdf.setFontSize(9);
      let columnCursor = 0;
      const cells = row.cells.map((cell) => {
        const span = Math.min(columnCount - columnCursor, Math.max(1, cell.colSpan || 1));
        const entry = {
          cell,
          column: columnCursor,
          span,
          lines: pdf.splitTextToSize(cell.text || '', columnWidth * span - padding * 2) as string[],
        };
        columnCursor += span;
        return entry;
      });
      const rowHeight = Math.max(22, ...cells.map(({ lines }) => lines.length * 11 + padding * 2));
      if (y + rowHeight > pageHeight - margin) {
        newPage();
        if (!isHeader) drawRow(header, true);
      }
      for (const { column, span, lines } of cells) {
        const x = margin + column * columnWidth;
        const cellWidth = columnWidth * span;
        if (isHeader) {
          pdf.setFillColor(235, 238, 245);
          pdf.rect(x, y, cellWidth, rowHeight, 'F');
        }
        pdf.setDrawColor(150, 158, 172);
        pdf.rect(x, y, cellWidth, rowHeight);
        pdf.setTextColor(20, 23, 31);
        lines.forEach((line, lineIndex) => pdf.text(line, x + padding, y + padding + 9 + lineIndex * 11));
      }
      y += rowHeight;
    };
    table.rows.forEach((row, index) => drawRow(row, index === 0));
    y += 12;
  };
  const drawBlock = (block: OcrBlock) => {
    if (block.type === 'table' && block.table) return drawTable(block.table);
    if (block.type === 'heading') {
      const level = Math.min(6, Math.max(1, block.level || 2));
      return drawText(block.text.replace(/^#{1,6}\s+/, ''), { size: Math.max(13, 22 - level * 2), bold: true });
    }
    if (block.type === 'list') {
      const prefix = block.listStyle === 'ordered' ? '1.  ' : '-  ';
      return drawText(block.text.replace(/^([-*+]|\d+[.)])\s+/, ''), { indent: 12, prefix });
    }
    drawText(block.text);
  };

  normalized.pages.forEach((page, pageIndex) => {
    if (pageIndex > 0) newPage();
    if (normalized.pages.length > 1) drawText(`Page ${page.pageNumber}`, { size: 10, bold: true });
    (page.blocks || []).forEach(drawBlock);
  });
  return pdf;
}

export async function exportReflowedPDF({
  fileName,
  structuredOcr
}: ExportReflowedPDFOptions): Promise<void> {
  const pdf = buildReflowedPdf(structuredOcr);
  pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}
