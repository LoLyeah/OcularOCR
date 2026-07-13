import { degrees, PDFDocument } from 'pdf-lib';

export interface PdfPagePlan {
  id: string;
  sourceId: string;
  pageIndex: number;
  rotation: number;
}

export interface PdfWorkspaceSource {
  id: string;
  data: ArrayBuffer;
}

export function normalizeRotation(rotation: number): number {
  return ((rotation % 360) + 360) % 360;
}

export function movePdfPage<T>(pages: readonly T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex < 0 || fromIndex >= pages.length || toIndex < 0 || toIndex >= pages.length || fromIndex === toIndex) {
    return [...pages];
  }
  const next = [...pages];
  const [page] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, page);
  return next;
}

export function rotatePdfPages(pages: readonly PdfPagePlan[], selectedIds: ReadonlySet<string>, delta: number): PdfPagePlan[] {
  return pages.map((page) => selectedIds.has(page.id)
    ? { ...page, rotation: normalizeRotation(page.rotation + delta) }
    : page);
}

export function deletePdfPages(pages: readonly PdfPagePlan[], selectedIds: ReadonlySet<string>): PdfPagePlan[] {
  return pages.filter((page) => !selectedIds.has(page.id));
}

export async function buildPdfFromPlan(sources: readonly PdfWorkspaceSource[], plan: readonly PdfPagePlan[]): Promise<ArrayBuffer> {
  if (plan.length === 0) throw new Error('At least one PDF page is required.');

  const sourceDocuments = new Map<string, PDFDocument>();
  for (const source of sources) {
    sourceDocuments.set(source.id, await PDFDocument.load(source.data, { ignoreEncryption: false }));
  }

  const output = await PDFDocument.create();
  for (const plannedPage of plan) {
    const source = sourceDocuments.get(plannedPage.sourceId);
    if (!source || plannedPage.pageIndex < 0 || plannedPage.pageIndex >= source.getPageCount()) {
      throw new Error('The PDF page plan references a missing source page.');
    }
    const [copiedPage] = await output.copyPages(source, [plannedPage.pageIndex]);
    const originalRotation = copiedPage.getRotation().angle;
    copiedPage.setRotation(degrees(normalizeRotation(originalRotation + plannedPage.rotation)));
    output.addPage(copiedPage);
  }

  const bytes = await output.save({ useObjectStreams: true });
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
