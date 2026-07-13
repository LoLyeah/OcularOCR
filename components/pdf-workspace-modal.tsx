import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Copy, GripVertical, Layers3, Loader2, RotateCcw, RotateCw, Save, Scissors, Trash2, Undo2, X } from 'lucide-react';
import { decryptBuffer, encryptBuffer } from '@/lib/crypto';
import { getPdfPageCount, renderPdfThumbnails } from '@/lib/pdf';
import {
  buildPdfFromPlan,
  deletePdfPages,
  movePdfPage,
  moveSelectedPdfPages,
  PdfPagePlan,
  PdfWorkspaceSource,
  rotatePdfPages,
} from '@/lib/pdf-workspace';
import { DocumentEntry, saveDocument } from '@/lib/storage';
import { useI18n } from '@/lib/i18n';
import { useToast } from './toast';
import { useDialogFocus } from '@/hooks/use-dialog-focus';

const MAX_WORKSPACE_PAGES = 200;
const MAX_WORKSPACE_BYTES = 100 * 1024 * 1024;

interface WorkspacePage extends PdfPagePlan {
  sourceName: string;
  thumbnail: string;
}

interface LoadedSource extends PdfWorkspaceSource {
  name: string;
}

interface PdfWorkspaceModalProps {
  documents: DocumentEntry[];
  cryptoKey: CryptoKey;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

function defaultOutputName(documents: DocumentEntry[]): string {
  if (documents.length === 1) return `${documents[0].name.replace(/\.pdf$/i, '')}-edited.pdf`;
  return 'merged-document.pdf';
}

export function PdfWorkspaceModal({ documents, cryptoKey, onClose, onSaved }: PdfWorkspaceModalProps) {
  const { language, t } = useI18n();
  const { toast } = useToast();
  const [sources, setSources] = useState<LoadedSource[]>([]);
  const [pages, setPages] = useState<WorkspacePage[]>([]);
  const [history, setHistory] = useState<WorkspacePage[][]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [outputName, setOutputName] = useState(() => defaultOutputName(documents));
  const [status, setStatus] = useState(t('pdfWorkspaceLoading'));
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const draggedIndex = useRef<number | null>(null);
  const dialogRef = useDialogFocus<HTMLElement>(onClose, { closeOnEscape: !isSaving });

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        if (documents.reduce((total, document) => total + document.encryptedData.byteLength, 0) > MAX_WORKSPACE_BYTES) {
          throw new Error(t('pdfWorkspaceTooLarge'));
        }
        let totalBytes = 0;
        let totalPages = 0;
        const loadedSources: LoadedSource[] = [];
        const loadedPages: WorkspacePage[] = [];

        for (const document of documents) {
          setStatus(t('pdfWorkspaceDecrypting', { name: document.name }));
          const data = await decryptBuffer(document.encryptedData, document.iv, cryptoKey);
          totalBytes += data.byteLength;
          if (totalBytes > MAX_WORKSPACE_BYTES) throw new Error(t('pdfWorkspaceTooLarge'));

          const pageCount = await getPdfPageCount(data);
          totalPages += pageCount;
          if (totalPages > MAX_WORKSPACE_PAGES) throw new Error(t('pdfWorkspaceTooManyPages', { count: MAX_WORKSPACE_PAGES }));

          setStatus(t('pdfWorkspaceRendering', { name: document.name }));
          const thumbnails = await renderPdfThumbnails(data);

          loadedSources.push({ id: document.id, name: document.name, data });
          thumbnails.forEach((thumbnail, pageIndex) => {
            loadedPages.push({
              id: `${document.id}:${pageIndex}`,
              sourceId: document.id,
              sourceName: document.name,
              pageIndex,
              rotation: 0,
              thumbnail,
            });
          });
        }

        if (!active) return;
        setSources(loadedSources);
        setPages(loadedPages);
        setStatus('');
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      } finally {
        if (active) setIsLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [cryptoKey, documents, t]);

  const selectedCount = selectedIds.size;
  const allSelected = pages.length > 0 && selectedCount === pages.length;
  const selectedPlan = useMemo(() => pages.filter((page) => selectedIds.has(page.id)), [pages, selectedIds]);

  const commitPages = (nextPages: WorkspacePage[]) => {
    if (nextPages.length === 0) {
      toast({ title: t('pdfWorkspaceKeepOnePage'), variant: 'info' });
      return;
    }
    setHistory((current) => [...current.slice(-19), pages]);
    setPages(nextPages);
    setSelectedIds((current) => new Set([...current].filter((id) => nextPages.some((page) => page.id === id))));
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setPages(previous);
    setHistory((current) => current.slice(0, -1));
    setSelectedIds(new Set());
  };

  const duplicateSelected = () => {
    if (selectedCount === 0 || pages.length + selectedCount > MAX_WORKSPACE_PAGES) return;
    const next = pages.flatMap((page) => selectedIds.has(page.id)
      ? [page, { ...page, id: crypto.randomUUID() }]
      : [page]);
    commitPages(next);
  };

  const savePlan = async (plan: WorkspacePage[], extracting: boolean) => {
    if (plan.length === 0 || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      setStatus(t('pdfWorkspaceBuilding'));
      const output = await buildPdfFromPlan(sources, plan);
      if (output.byteLength > MAX_WORKSPACE_BYTES) throw new Error(t('pdfWorkspaceOutputTooLarge'));
      const { encrypted, iv } = await encryptBuffer(output, cryptoKey);
      const baseName = outputName.trim().replace(/\.pdf$/i, '') || 'document';
      const name = `${baseName}${extracting ? '-extract' : ''}.pdf`;
      await saveDocument({
        id: crypto.randomUUID(),
        name,
        type: 'application/pdf',
        createdAt: Date.now(),
        encryptedData: encrypted,
        iv,
      }, cryptoKey);
      await onSaved();
      toast({ title: t('pdfWorkspaceSaved'), description: name, variant: 'success' });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setIsSaving(false);
      setStatus('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-2 backdrop-blur-sm sm:p-5">
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="pdf-workspace-title" tabIndex={-1} className="flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 id="pdf-workspace-title" className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Layers3 className="h-4 w-4 text-indigo-600" /> {t('pdfWorkspaceTitle')}
            </h2>
            <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
              {t('pdfWorkspaceSourceSummary', { files: documents.length, pages: pages.length })}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} aria-label={t('close')} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
          <button type="button" onClick={undo} disabled={history.length === 0 || isLoading || isSaving} className="pdf-tool-button">
            <Undo2 className="h-3.5 w-3.5" /> {t('undo')}
          </button>
          <button type="button" onClick={() => commitPages(moveSelectedPdfPages(pages, selectedIds, -1))} disabled={selectedCount === 0 || isSaving} className="pdf-tool-button">
            <ArrowLeft className="h-3.5 w-3.5" /> {t('moveEarlier')}
          </button>
          <button type="button" onClick={() => commitPages(moveSelectedPdfPages(pages, selectedIds, 1))} disabled={selectedCount === 0 || isSaving} className="pdf-tool-button">
            <ArrowRight className="h-3.5 w-3.5" /> {t('moveLater')}
          </button>
          <button type="button" onClick={() => commitPages(rotatePdfPages(pages, selectedIds, -90) as WorkspacePage[])} disabled={selectedCount === 0 || isSaving} className="pdf-tool-button">
            <RotateCcw className="h-3.5 w-3.5" /> {t('rotateLeft')}
          </button>
          <button type="button" onClick={() => commitPages(rotatePdfPages(pages, selectedIds, 90) as WorkspacePage[])} disabled={selectedCount === 0 || isSaving} className="pdf-tool-button">
            <RotateCw className="h-3.5 w-3.5" /> {t('rotateRight')}
          </button>
          <button type="button" onClick={duplicateSelected} disabled={selectedCount === 0 || pages.length + selectedCount > MAX_WORKSPACE_PAGES || isSaving} className="pdf-tool-button">
            <Copy className="h-3.5 w-3.5" /> {t('duplicate')}
          </button>
          <button type="button" onClick={() => commitPages(deletePdfPages(pages, selectedIds) as WorkspacePage[])} disabled={selectedCount === 0 || selectedCount === pages.length || isSaving} className="pdf-tool-button text-red-600 dark:text-red-400">
            <Trash2 className="h-3.5 w-3.5" /> {t('deletePages')}
          </button>
          <button type="button" onClick={() => setSelectedIds(allSelected ? new Set() : new Set(pages.map((page) => page.id)))} disabled={isLoading || isSaving} className="ml-auto text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
            {allSelected ? t('clearSelection') : t('selectAllPages')}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {(isLoading || isSaving) && (
            <div className="flex h-full min-h-48 flex-col items-center justify-center text-slate-500 dark:text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              <p className="mt-3 text-xs font-semibold">{status}</p>
            </div>
          )}
          {!isLoading && !isSaving && error && (
            <div className="mx-auto mt-8 max-w-lg rounded-lg border border-red-200 bg-red-50 p-4 text-center text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-400">
              {error}
            </div>
          )}
          {!isLoading && !isSaving && !error && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {pages.map((page, index) => (
                <button
                  type="button"
                  key={page.id}
                  draggable
                  onDragStart={() => { draggedIndex.current = index; }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (draggedIndex.current !== null) commitPages(movePdfPage(pages, draggedIndex.current, index));
                    draggedIndex.current = null;
                  }}
                  onClick={() => toggleSelection(page.id)}
                  aria-pressed={selectedIds.has(page.id)}
                  className={`group relative rounded-lg border p-2 text-left transition ${selectedIds.has(page.id) ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200 dark:bg-indigo-950/30 dark:ring-indigo-900' : 'border-slate-200 bg-white hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-600'}`}
                >
                  <GripVertical className="absolute left-1 top-1 h-3.5 w-3.5 text-slate-300 opacity-0 transition group-hover:opacity-100" />
                  <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                    <Image src={page.thumbnail} width={140} height={190} unoptimized alt={t('pdfPageThumbnail', { page: page.pageIndex + 1 })} className="max-h-full max-w-full object-contain shadow-sm transition-transform" style={{ transform: `rotate(${page.rotation}deg)` }} />
                  </div>
                  <p className="mt-1.5 truncate text-[10px] font-bold text-slate-700 dark:text-slate-300">{index + 1}. {page.sourceName}</p>
                  <p className="text-[9px] text-slate-400">{t('sourcePage', { page: page.pageIndex + 1 })}{page.rotation ? ` · ${page.rotation}°` : ''}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <footer className="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex-1">
              <label className="sr-only" htmlFor="pdf-output-name">{t('pdfOutputName')}</label>
              <input id="pdf-output-name" value={outputName} onChange={(event) => setOutputName(event.target.value)} maxLength={180} className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              <p className="mt-1 text-[9px] text-slate-400">{t('pdfWorkspaceOriginalSafe')}</p>
            </div>
            <button type="button" onClick={() => savePlan(selectedPlan, true)} disabled={selectedCount === 0 || isLoading || isSaving} className="inline-flex items-center justify-center gap-1.5 rounded border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700 disabled:opacity-50 dark:border-indigo-800 dark:text-indigo-300">
              <Scissors className="h-3.5 w-3.5" /> {t('extractSelectedPages', { count: selectedCount })}
            </button>
            <button type="button" onClick={() => savePlan(pages, false)} disabled={pages.length === 0 || isLoading || isSaving} className="inline-flex items-center justify-center gap-1.5 rounded bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
              <Save className="h-3.5 w-3.5" /> {t('saveAsNewPdf')}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
