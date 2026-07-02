import { jsPDF } from 'jspdf';
import { StructuredOcrResult } from './storage';

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

  // Create jsPDF instance
  // We will configure page sizes dynamically for each page in points to match canvas pixels
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

    // 1. Add visual background image (original/preprocessed canvas)
    // Convert canvas to JPEG string. High quality (0.95) to preserve readability.
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, width, height, undefined, 'FAST');

    // 2. Add invisible text layer matching OCR coordinates
    // Match by page index (Tesseract pages are 1-indexed, array is 0-indexed)
    const pageNumber = i + 1;
    const pageData = structuredOcr.pages?.find(p => p.pageNumber === pageNumber);

    if (pageData && pageData.words && pageData.words.length > 0) {
      pdf.setFont('helvetica', 'normal');
      
      for (const word of pageData.words) {
        if (!word.text || !word.bbox) continue;
        const { x0, y0, x1, y1 } = word.bbox;
        const w = x1 - x0;
        const h = y1 - y0;

        // Skip invalid bounding boxes
        if (w <= 0 || h <= 0) continue;

        // Set font size to match bounding box height (approximate font size)
        pdf.setFontSize(h);

        // Render invisible text. y1 is the bottom of the bounding box, 
        // which matches the baseline coordinate in PDF rendering.
        pdf.text(word.text, x0, y1, {
          renderingMode: 'invisible'
        });
      }
    }
  }

  // Save the PDF
  pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}
