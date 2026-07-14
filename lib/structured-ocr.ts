import type {
  OcrBlock,
  OcrBlockType,
  OcrPageData,
  OcrTable,
  OcrTableCell,
  StructuredOcrResult,
} from './storage';

export const STRUCTURED_OCR_VERSION = 2;

const EMPTY_BBOX = { x0: 0, y0: 0, x1: 0, y1: 0 };

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim() : '';
}

function blockId(pageNumber: number, index: number): string {
  return `page-${pageNumber}-block-${index + 1}`;
}

function normalizeCell(value: unknown): OcrTableCell {
  if (typeof value === 'string') return { text: value };
  const cell = value && typeof value === 'object' ? value as Partial<OcrTableCell> : {};
  return {
    text: cleanText(cell.text),
    ...(cell.isHeader ? { isHeader: true } : {}),
    ...(Number.isInteger(cell.rowSpan) && Number(cell.rowSpan) > 1 ? { rowSpan: Number(cell.rowSpan) } : {}),
    ...(Number.isInteger(cell.colSpan) && Number(cell.colSpan) > 1 ? { colSpan: Number(cell.colSpan) } : {}),
    ...(cell.bbox ? { bbox: cell.bbox } : {}),
    ...(typeof cell.confidence === 'number' ? { confidence: cell.confidence } : {}),
  };
}

export function normalizeTable(value: unknown, pageNumber: number, fallbackId: string): OcrTable | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const table = value as Partial<OcrTable>;
  if (!Array.isArray(table.rows) || table.rows.length === 0) return undefined;
  const rows = table.rows
    .map((row) => ({
      cells: Array.isArray(row?.cells) ? row.cells.map(normalizeCell) : [],
    }))
    .filter((row) => row.cells.length > 0);
  if (rows.length === 0) return undefined;
  return {
    id: cleanText(table.id) || fallbackId,
    pageNumber,
    rows,
    ...(table.bbox ? { bbox: table.bbox } : {}),
    ...(typeof table.confidence === 'number' ? { confidence: table.confidence } : {}),
    source: table.source || 'provider',
  };
}

export function tablePlainText(table: OcrTable): string {
  return table.rows.map((row) => row.cells.map((cell) => cell.text).join('\t')).join('\n');
}

function inferBlockType(text: string): { type: OcrBlockType; level?: number; listStyle?: 'ordered' | 'unordered' } {
  const trimmed = text.trim();
  const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
  if (heading) return { type: 'heading', level: heading[1].length };
  if (/^[-*+]\s+/.test(trimmed)) return { type: 'list', listStyle: 'unordered' };
  if (/^\d+[.)]\s+/.test(trimmed)) return { type: 'list', listStyle: 'ordered' };
  return { type: 'text' };
}

function fallbackBlocks(page: Partial<OcrPageData>, pageNumber: number): OcrBlock[] {
  if (Array.isArray(page.lines) && page.lines.length > 0) {
    return page.lines.map((line, index) => ({
      id: blockId(pageNumber, index),
      bbox: line.bbox || EMPTY_BBOX,
      text: cleanText(line.text),
      ...inferBlockType(line.text),
    })).filter((block) => block.text);
  }
  return cleanText(page.text).split(/\n\s*\n|\n/).map((text, index) => ({
    id: blockId(pageNumber, index),
    bbox: EMPTY_BBOX,
    text: text.trim(),
    ...inferBlockType(text),
  })).filter((block) => block.text);
}

export function normalizeStructuredOcrResult(value: unknown): StructuredOcrResult {
  const input = value && typeof value === 'object' ? value as Partial<StructuredOcrResult> : {};
  const rawPages = Array.isArray(input.pages) ? input.pages : [];
  const pages = rawPages.map((rawPage, pageIndex): OcrPageData => {
    const page = rawPage && typeof rawPage === 'object' ? rawPage as Partial<OcrPageData> : {};
    const pageNumber = Number.isInteger(page.pageNumber) && Number(page.pageNumber) > 0
      ? Number(page.pageNumber)
      : pageIndex + 1;
    const rawBlocks = Array.isArray(page.blocks) && page.blocks.length > 0
      ? page.blocks
      : fallbackBlocks(page, pageNumber);
    const blocks = rawBlocks.map((rawBlock, blockIndex): OcrBlock | null => {
      const candidate = rawBlock && typeof rawBlock === 'object' ? rawBlock as Partial<OcrBlock> : {};
      const text = cleanText(candidate.text);
      const type: OcrBlockType = ['text', 'heading', 'table', 'list'].includes(candidate.type || '')
        ? candidate.type as OcrBlockType
        : inferBlockType(text).type;
      const id = cleanText(candidate.id) || blockId(pageNumber, blockIndex);
      const table = type === 'table' ? normalizeTable(candidate.table, pageNumber, `${id}-table`) : undefined;
      if (!text && !table) return null;
      return {
        id,
        bbox: candidate.bbox || EMPTY_BBOX,
        text: table ? tablePlainText(table) : text,
        type,
        ...(candidate.level ? { level: candidate.level } : {}),
        ...(candidate.listStyle ? { listStyle: candidate.listStyle } : {}),
        ...(table ? { table } : {}),
        ...(typeof candidate.confidence === 'number' ? { confidence: candidate.confidence } : {}),
      };
    }).filter((block): block is OcrBlock => Boolean(block));
    const explicitTables = Array.isArray(page.tables)
      ? page.tables.map((table, index) => normalizeTable(table, pageNumber, `page-${pageNumber}-table-${index + 1}`)).filter((table): table is OcrTable => Boolean(table))
      : [];
    const tableMap = new Map<string, OcrTable>();
    for (const table of [...explicitTables, ...blocks.map((block) => block.table).filter((table): table is OcrTable => Boolean(table))]) {
      tableMap.set(table.id, table);
    }
    const text = blocks.map((block) => block.type === 'table' && block.table ? tablePlainText(block.table) : block.text).join('\n\n') || cleanText(page.text);
    return {
      pageNumber,
      text,
      words: Array.isArray(page.words) ? page.words : [],
      ...(Array.isArray(page.lines) ? { lines: page.lines } : {}),
      blocks,
      tables: [...tableMap.values()],
      ...(typeof page.width === 'number' ? { width: page.width } : {}),
      ...(typeof page.height === 'number' ? { height: page.height } : {}),
    };
  }).sort((a, b) => a.pageNumber - b.pageNumber);
  const text = pages.map((page) => pages.length > 1 ? `--- PAGE ${page.pageNumber} ---\n${page.text}` : page.text).join('\n\n');
  return { version: STRUCTURED_OCR_VERSION, text, pages };
}

export function replacePageBlocks(result: StructuredOcrResult, pageNumber: number, blocks: OcrBlock[]): StructuredOcrResult {
  return normalizeStructuredOcrResult({
    ...result,
    pages: result.pages.map((page) => page.pageNumber === pageNumber ? { ...page, blocks } : page),
  });
}

export function inferOfflineBlockTypes(blocks: OcrBlock[]): OcrBlock[] {
  const heights = blocks.map((block) => Math.max(1, block.bbox.y1 - block.bbox.y0)).sort((a, b) => a - b);
  const typicalHeight = heights.length ? heights[Math.floor(heights.length / 2)] : 1;
  return blocks.map((block) => {
    const text = block.text.trim();
    if (/^[-*+]\s+/.test(text)) return { ...block, type: 'list', listStyle: 'unordered' };
    if (/^\d+[.)]\s+/.test(text)) return { ...block, type: 'list', listStyle: 'ordered' };
    const height = Math.max(1, block.bbox.y1 - block.bbox.y0);
    if (block.type === 'text' && text.split(/\s+/).length <= 12 && height >= typicalHeight * 1.35) {
      return { ...block, type: 'heading', level: height >= typicalHeight * 1.8 ? 1 : 2 };
    }
    return block;
  });
}

export function structureConfidence(result: StructuredOcrResult): number | undefined {
  const normalized = normalizeStructuredOcrResult(result);
  const values = normalized.pages.flatMap((page) => [
    ...(page.blocks || []).map((block) => block.confidence),
    ...(page.tables || []).map((table) => table.confidence),
    ...page.words.map((word) => word.confidence),
  ]).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
