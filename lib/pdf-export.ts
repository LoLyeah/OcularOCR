import { jsPDF } from 'jspdf';
import { StructuredOcrResult, OcrWord } from './storage';

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
  pageCanvases: HTMLCanvasElement[];
  structuredOcr: StructuredOcrResult;
}

export async function exportSearchablePDF({
  fileName,
  pageCanvases,
  structuredOcr
}: ExportSearchablePDFOptions): Promise<void> {
  if (pageCanvases.length === 0) {
    throw new Error('No pages available to export.');
  }

  const firstCanvas = pageCanvases[0];
  const pdf = new jsPDF({
    orientation: firstCanvas.width > firstCanvas.height ? 'l' : 'p',
    unit: 'pt',
    format: [firstCanvas.width, firstCanvas.height],
    compress: true
  });

  for (let i = 0; i < pageCanvases.length; i++) {
    const canvas = pageCanvases[i];
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
  }

  pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}

interface ExportReflowedPDFOptions {
  fileName: string;
  structuredOcr: StructuredOcrResult;
  pageDimensions: { width: number; height: number }[];
}

export async function exportReflowedPDF({
  fileName,
  structuredOcr,
  pageDimensions
}: ExportReflowedPDFOptions): Promise<void> {
  const getPageDim = (idx: number) => {
    if (pageDimensions && pageDimensions[idx]) {
      return pageDimensions[idx];
    }
    return { width: 612, height: 792 };
  };

  const firstDim = getPageDim(0);
  const pdf = new jsPDF({
    orientation: firstDim.width > firstDim.height ? 'l' : 'p',
    unit: 'pt',
    format: [firstDim.width, firstDim.height],
    compress: true
  });

  const pageCount = Math.max(
    structuredOcr.pages?.length || 1,
    pageDimensions.length
  );

  for (let i = 0; i < pageCount; i++) {
    if (i > 0) {
      const dim = getPageDim(i);
      pdf.addPage([dim.width, dim.height], dim.width > dim.height ? 'l' : 'p');
    }

    const pageNumber = i + 1;
    const pageData = structuredOcr.pages?.find(p => p.pageNumber === pageNumber);

    if (pageData && pageData.words && pageData.words.length > 0) {
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);

      const lines = groupWordsIntoLines(pageData.words);
      for (const line of lines) {
        if (!line.text.trim()) continue;
        const lineHeight = line.y1 - line.y0;
        if (lineHeight <= 0) continue;

        const fontSize = Math.max(4, lineHeight);
        pdf.setFontSize(fontSize);
        pdf.text(line.text, line.x0, line.y1, {
          renderingMode: 'fill'
        });
      }
    } else if (pageData && pageData.text) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);

      const lines = pageData.text.split('\n');
      let y = 20;
      for (const line of lines) {
        if (y > getPageDim(i).height - 20) {
          const dim = getPageDim(pageCount); // fallback
          pdf.addPage([dim.width, dim.height], dim.width > dim.height ? 'l' : 'p');
          y = 20;
        }
        if (line.trim()) {
          pdf.text(line, 20, y);
        }
        y += 14;
      }
    }
  }

  pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}
