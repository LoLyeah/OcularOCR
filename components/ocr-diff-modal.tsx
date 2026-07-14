import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Loader2, X, Check, AlertTriangle } from 'lucide-react';
import { AISettings, StructuredOcrResult } from '@/lib/storage';
import { performOCR } from '@/lib/ocr';
import { extractTextFromImages } from '@/lib/ai';
import { useI18n } from '@/lib/i18n';
import { useDialogFocus } from '@/hooks/use-dialog-focus';

interface OcrDiffModalProps {
  canvases: HTMLCanvasElement[];
  pageNumber: number;
  settings: AISettings;
  languages: string;
  prepOpts: any;
  onClose: () => void;
  onPickResult: (text: string, isTesseract: boolean) => void;
}

export function OcrDiffModal({ canvases, pageNumber, settings, languages, prepOpts, onClose, onPickResult }: OcrDiffModalProps) {
  const { t } = useI18n();
  const [tesseractText, setTesseractText] = useState<string | null>(null);
  const [llmText, setLlmText] = useState<string | null>(null);
  const [loading, setLoading] = useState<'tesseract' | 'llm' | 'both' | null>('both');
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);

  useEffect(() => {
    async function runBoth() {
      try {
        const tessPromise = (async () => {
          try {
            const result = await performOCR(canvases, languages, prepOpts);
            setTesseractText(result.text);
          } catch (e) {
            console.error('Tesseract diff failed', e);
            setTesseractText('[Tesseract failed]');
          }
          setLoading(prev => prev === 'both' ? 'llm' : prev === 'tesseract' ? null : prev);
        })();

        const llmPromise = (async () => {
          try {
            const imagesBase64 = canvases.map(c => c.toDataURL('image/jpeg', 0.8));
            const text = await extractTextFromImages(imagesBase64, settings);
            setLlmText(text);
          } catch (e) {
            console.error('LLM diff failed', e);
            setLlmText('[LLM Vision failed]');
          }
          setLoading(prev => prev === 'both' ? 'tesseract' : prev === 'llm' ? null : prev);
        })();

        await Promise.all([tessPromise, llmPromise]);
      } catch (e: any) {
        setError(e.message || 'Comparison failed');
      }
    }
    runBoth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getDiffSegments = (a: string, b: string) => {
    const wordsA = a.split(/\s+/);
    const wordsB = b.split(/\s+/);
    const setB = new Set(wordsB);
    const setA = new Set(wordsA);
    const onlyInA = wordsA.filter(w => !setB.has(w));
    const onlyInB = wordsB.filter(w => !setA.has(w));
    return { onlyInA, onlyInB };
  };

  const diff = tesseractText && llmText
    ? getDiffSegments(tesseractText, llmText)
    : { onlyInA: [] as string[], onlyInB: [] as string[] };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm px-4"
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ocr-compare-title"
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="flex h-[80dvh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-slate-900"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 id="ocr-compare-title" className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Compare OCR Engines · Page {pageNumber}
          </h2>
          <button onClick={onClose} aria-label={t('close')} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-950/30 text-xs text-red-700 dark:text-red-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            {error}
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Tesseract side */}
          <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tesseract.js
              </span>
              {tesseractText && (
                <button
                  onClick={() => onPickResult(tesseractText, true)}
                  className="flex items-center gap-1 px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-bold rounded cursor-pointer"
                >
                  <Check className="h-3 w-3" />
                  Use this
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
              {loading === 'both' || loading === 'tesseract' ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <pre className="text-[11px] font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                  {tesseractText}
                </pre>
              )}
            </div>
          </div>

          {/* LLM side */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {settings.provider === 'gemini' ? 'Gemini' : settings.provider === 'openai' ? 'OpenAI/Groq' : 'Ollama'} Vision
              </span>
              {llmText && (
                <button
                  onClick={() => onPickResult(llmText, false)}
                  className="flex items-center gap-1 px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-bold rounded cursor-pointer"
                >
                  <Check className="h-3 w-3" />
                  Use this
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
              {loading === 'both' || loading === 'llm' ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <pre className="text-[11px] font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                  {llmText}
                </pre>
              )}
            </div>
          </div>
        </div>

        {/* Diff summary footer */}
        {diff.onlyInA.length > 0 || diff.onlyInB.length > 0 ? (
          <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[10px] text-slate-500 dark:text-slate-400 shrink-0">
            <span className="font-bold text-indigo-600 dark:text-indigo-400">Diff:</span>{' '}
            <span className="text-red-600">{diff.onlyInA.length} words</span> unique to Tesseract,{' '}
            <span className="text-emerald-600">{diff.onlyInB.length} words</span> unique to LLM.
          </div>
        ) : loading === null ? (
          <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 shrink-0">
            Waiting for results...
          </div>
        ) : null}
      </motion.div>
    </motion.div>
  );
}
