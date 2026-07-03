import { OcrLine, OcrBlock, OcrWord } from './storage';

function parseBbox(title: string): { x0: number; y0: number; x1: number; y1: number } | null {
  const m = title.match(/bbox\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
  if (!m) return null;
  return { x0: parseInt(m[1]), y0: parseInt(m[2]), x1: parseInt(m[3]), y1: parseInt(m[4]) };
}

function getTextContent(el: Element): string {
  let text = '';
  for (const child of el.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      text += child.textContent || '';
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = (child as Element).tagName.toLowerCase();
      if (tag === 'br' || tag === 'p' || tag === 'div') {
        text += '\n';
      } else if (tag === 'span' || tag === 'strong' || tag === 'em' || tag === 'b' || tag === 'i') {
        text += getTextContent(child as Element);
      } else if (tag === 'ocr_word' || tag === 'ocrx_word') {
        text += getTextContent(child as Element) + ' ';
      } else {
        text += getTextContent(child as Element);
      }
    }
  }
  return text;
}

function mapBlockType(classNames: string): 'text' | 'heading' | 'table' | 'list' {
  const c = classNames.toLowerCase();
  if (c.includes('heading') || c.includes('header') || c.includes('title')) return 'heading';
  if (c.includes('table')) return 'table';
  if (c.includes('list')) return 'list';
  return 'text';
}

export function parseHocr(
  hocrXml: string,
  pageWidth: number,
  pageHeight: number
): { lines: OcrLine[]; blocks: OcrBlock[] } {
  const lines: OcrLine[] = [];
  const blocks: OcrBlock[] = [];

  const parser = new DOMParser();
  let doc: Document;
  try {
    doc = parser.parseFromString(hocrXml, 'text/html');
  } catch {
    return { lines, blocks };
  }

  const ocrPage = doc.querySelector('.ocr_page');
  if (!ocrPage) return { lines, blocks };

  // Scale factor if hOCR uses different coordinate space
  const pageBbox = parseBbox(ocrPage.getAttribute('title') || '');
  let scaleX = 1;
  let scaleY = 1;
  if (pageBbox && pageBbox.x1 > 0 && pageBbox.y1 > 0) {
    scaleX = pageWidth / pageBbox.x1;
    scaleY = pageHeight / pageBbox.y1;
  }

  const careas = ocrPage.querySelectorAll(':scope > .ocr_carea, :scope > .ocrx_block');
  if (careas.length === 0) {
    // Fallback: grab paragraphs directly
    const pars = ocrPage.querySelectorAll(':scope > .ocr_par, :scope > .ocrx_par');
    for (const par of pars) {
      processParagraph(par, lines, blocks, scaleX, scaleY);
    }
  }

  for (const carea of careas) {
    const areaBbox = parseBbox(carea.getAttribute('title') || '');
    const pars = carea.querySelectorAll(':scope > .ocr_par, :scope > .ocrx_par');
    for (const par of pars) {
      processParagraph(par, lines, blocks, scaleX, scaleY);
    }

    if (pars.length === 0) {
      // No paragraphs in this carea, treat as single block
      const areaText = getTextContent(carea).trim();
      if (areaText && areaBbox) {
        blocks.push({
          bbox: {
            x0: Math.round(areaBbox.x0 * scaleX),
            y0: Math.round(areaBbox.y0 * scaleY),
            x1: Math.round(areaBbox.x1 * scaleX),
            y1: Math.round(areaBbox.y1 * scaleY)
          },
          text: areaText,
          type: mapBlockType(carea.className)
        });
      }
    }
  }

  return { lines, blocks };
}

function processParagraph(
  par: Element,
  lines: OcrLine[],
  blocks: OcrBlock[],
  scaleX: number,
  scaleY: number
) {
  const parBbox = parseBbox(par.getAttribute('title') || '');
  const classNames = par.parentElement?.className || '';

  const words: OcrWord[] = [];
  const wordEls = par.querySelectorAll(':scope > .ocr_word, :scope > .ocrx_word');

  for (const wEl of wordEls) {
    const wBbox = parseBbox(wEl.getAttribute('title') || '');
    if (!wBbox) continue;
    const text = getTextContent(wEl).trim();
    if (!text) continue;

    words.push({
      text,
      bbox: {
        x0: Math.round(wBbox.x0 * scaleX),
        y0: Math.round(wBbox.y0 * scaleY),
        x1: Math.round(wBbox.x1 * scaleX),
        y1: Math.round(wBbox.y1 * scaleY)
      }
    });
  }

  if (words.length === 0) return;

  const lineBbox = {
    x0: Math.min(...words.map(w => w.bbox.x0)),
    y0: Math.min(...words.map(w => w.bbox.y0)),
    x1: Math.max(...words.map(w => w.bbox.x1)),
    y1: Math.max(...words.map(w => w.bbox.y1))
  };

  const lineText = words.map(w => w.text).join(' ');

  lines.push({
    bbox: lineBbox,
    text: lineText,
    words
  });

  if (words.length > 0 && parBbox) {
    blocks.push({
      bbox: {
        x0: Math.round(parBbox.x0 * scaleX),
        y0: Math.round(parBbox.y0 * scaleY),
        x1: Math.round(parBbox.x1 * scaleX),
        y1: Math.round(parBbox.y1 * scaleY)
      },
      text: lineText,
      type: mapBlockType(classNames)
    });
  }
}
