import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ScanText, Brain, FileText, Loader2, Sparkles, Send, Download, RefreshCw, AlertTriangle, X, Tag, Plus, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { DocumentEntry, getSettings, saveDocument, AISettings } from '@/lib/storage';
import { decryptBuffer, decryptString, encryptString } from '@/lib/crypto';
import { performOCR } from '@/lib/ocr';
import { renderPdfToCanvas } from '@/lib/pdf';
import { summarizeText, extractTextFromImages } from '@/lib/ai';
import { suggestTags } from '@/lib/tagger';
import ReactMarkdown from 'react-markdown';
import { getTagColors } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from './toast';
import { useI18n } from '@/lib/i18n';

interface DocumentViewerProps {
  doc: DocumentEntry;
  cryptoKey: CryptoKey;
  onClose: () => void;
}

export function parseOcrPages(text: string): { pageNumber: number; text: string }[] {
  if (!text) return [];
  
  const pageRegex = /---\s*PAGE\s+(\d+)\s*---/gi;
  const matches = [...text.matchAll(pageRegex)];
  
  if (matches.length === 0) {
    return [{ pageNumber: 1, text }];
  }
  
  const pages: { pageNumber: number; text: string }[] = [];
  
  for (let i = 0; i < matches.length; i++) {
    const currentMatch = matches[i];
    const pageNum = parseInt(currentMatch[1], 10);
    const startIndex = currentMatch.index! + currentMatch[0].length;
    const endIndex = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const pageText = text.substring(startIndex, endIndex).trim();
    pages.push({ pageNumber: pageNum, text: pageText });
  }
  
  return pages;
}

export function DocumentViewer({ doc, cryptoKey, onClose }: DocumentViewerProps) {
  const { t, language } = useI18n();
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  
  const [tags, setTags] = useState<string[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isAutoTagging, setIsAutoTagging] = useState(false);
  const [tagInput, setTagInput] = useState('');
  
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [useLlmForOcr, setUseLlmForOcr] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'preview' | 'ocr'>('preview');
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const [selectedOcrPage, setSelectedOcrPage] = useState<number>(1);
  const [ocrViewMode, setOcrViewMode] = useState<'single' | 'all'>('single');
  
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true);
    }
  }, [isMobile]);

  useEffect(() => {
    let objectUrl: string;
    
    async function loadData() {
      try {
        const decryptedBuffer = await decryptBuffer(doc.encryptedData, doc.iv, cryptoKey);
        const blob = new Blob([decryptedBuffer], { type: doc.type });
        objectUrl = URL.createObjectURL(blob);
        
        if (doc.type.includes('pdf')) {
          const canvases = await renderPdfToCanvas(decryptedBuffer);
          if (pdfContainerRef.current) {
            pdfContainerRef.current.innerHTML = '';
            canvases.forEach(canvas => {
              canvas.style.width = '100%';
              canvas.style.marginBottom = '16px';
              canvas.style.borderRadius = '8px';
              pdfContainerRef.current?.appendChild(canvas);
            });
          }
        } else {
          setFileUrl(objectUrl);
        }

        if (doc.encryptedOcrText && doc.ocrTextIv) {
          const text = await decryptString(doc.encryptedOcrText, doc.ocrTextIv, cryptoKey);
          setOcrText(text);
        }
        
        if (doc.encryptedSummary && doc.summaryIv) {
          const sum = await decryptString(doc.encryptedSummary, doc.summaryIv, cryptoKey);
          setSummary(sum);
        }

        if (doc.encryptedTags && doc.tagsIv) {
          try {
            const tagStr = await decryptString(doc.encryptedTags, doc.tagsIv, cryptoKey);
            setTags(JSON.parse(tagStr));
          } catch (e) {
            console.error('Failed to decrypt tags', e);
          }
        }

        // Fetch settings to check if LLM is used for OCR
        const encryptedSettings = await getSettings();
        if (encryptedSettings) {
          try {
            const decryptedStr = await decryptString(encryptedSettings.data, encryptedSettings.iv, cryptoKey);
            const settings = JSON.parse(decryptedStr) as AISettings;
            setUseLlmForOcr(!!settings?.useLlmForOcr);
          } catch (e) {
            console.error('Failed to decrypt settings for OCR check', e);
          }
        }
      } catch (err) {
        console.error('Failed to load document', err);
      }
    }
    loadData();
    
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [doc, cryptoKey]);

  const handleRunOcr = async () => {
    setIsProcessingOcr(true);
    setActiveTab('ocr');
    setError(null);
    try {
      const encryptedSettings = await getSettings();
      let settings: AISettings | undefined;
      if (encryptedSettings) {
        const decryptedStr = await decryptString(encryptedSettings.data, encryptedSettings.iv, cryptoKey);
        settings = JSON.parse(decryptedStr);
      }

      setUseLlmForOcr(!!settings?.useLlmForOcr);

      let extractedText = '';
      
      if (settings?.useLlmForOcr) {
        const imagesBase64: string[] = [];
        if (doc.type.includes('pdf')) {
          const canvases = pdfContainerRef.current?.querySelectorAll('canvas');
          if (canvases) {
            for (const canvas of canvases) {
              imagesBase64.push(canvas.toDataURL('image/jpeg', 0.8));
            }
          }
        } else if (fileUrl) {
          const img = new Image();
          img.src = fileUrl;
          await new Promise((resolve) => { img.onload = resolve; });
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            imagesBase64.push(canvas.toDataURL('image/jpeg', 0.8));
          }
        }
        
        if (imagesBase64.length === 0) {
           throw new Error("No images found to extract text from.");
        }
        
        extractedText = await extractTextFromImages(imagesBase64, settings);
      } else {
        if (doc.type.includes('pdf')) {
          const canvases = pdfContainerRef.current?.querySelectorAll('canvas');
          if (canvases) {
            let pageIdx = 1;
            for (const canvas of canvases) {
              const text = await performOCR(canvas);
              extractedText += `--- PAGE ${pageIdx} ---\n${text}\n\n`;
              pageIdx++;
            }
          }
        } else if (fileUrl) {
          const img = new Image();
          img.src = fileUrl;
          await new Promise((resolve) => { img.onload = resolve; });
          extractedText = await performOCR(img);
        }
      }
      
      setOcrText(extractedText);
      
      let encryptedTags = doc.encryptedTags;
      let tagsIv = doc.tagsIv;
      try {
        const suggested = await suggestTags(extractedText, doc.name, settings);
        if (suggested.length > 0) {
          const mergedTags = Array.from(new Set([...tags, ...suggested]));
          setTags(mergedTags);
          const tagEncryption = await encryptString(JSON.stringify(mergedTags), cryptoKey);
          encryptedTags = tagEncryption.encrypted;
          tagsIv = tagEncryption.iv;
        }
      } catch (tagErr) {
        console.error('Auto-tagging failed', tagErr);
      }

      // Save OCR to DB
      const { encrypted, iv } = await encryptString(extractedText, cryptoKey);
      const { decryptedTags, ...docToSave } = doc as any;
      await saveDocument({
        ...docToSave,
        encryptedOcrText: encrypted,
        ocrTextIv: iv,
        encryptedTags,
        tagsIv
      });
      toast({
        title: language === 'id' ? "Teks berhasil diekstrak" : "Text extracted successfully",
        variant: "success"
      });
    } catch (err: any) {
      setError(err.message || 'OCR failed');
      console.error('OCR failed', err);
    } finally {
      setIsProcessingOcr(false);
    }
  };

  const handleSummarize = async () => {
    if (!ocrText) return;
    setIsSummarizing(true);
    setError(null);
    try {
      const encryptedSettings = await getSettings();
      let settings: AISettings;
      if (!encryptedSettings) {
        throw new Error('AI settings not configured.');
      }
      
      const decryptedStr = await decryptString(encryptedSettings.data, encryptedSettings.iv, cryptoKey);
      settings = JSON.parse(decryptedStr);
      
      const res = await summarizeText(ocrText, settings, tags);
      setSummary(res);
      
      // Save summary to DB
      const { encrypted, iv } = await encryptString(res, cryptoKey);
      const { decryptedTags, ...docToSave } = doc as any;
      await saveDocument({
        ...docToSave,
        encryptedSummary: encrypted,
        summaryIv: iv
      });
      toast({
        title: language === 'id' ? "Ringkasan berhasil dibuat" : "Summary generated",
        variant: "success"
      });
    } catch (err: any) {
      setError(err.message || 'Summarization failed');
      console.error(err);
    } finally {
      setIsSummarizing(false);
    }
  };

  useEffect(() => {
    if (!ocrText) {
      if (suggestedTags.length > 0) {
        Promise.resolve().then(() => {
          setSuggestedTags([]);
        });
      }
      return;
    }
    
    async function getSuggestions() {
      setIsAutoTagging(true);
      try {
        const encryptedSettings = await getSettings();
        let settings: AISettings | undefined;
        if (encryptedSettings) {
          const decryptedStr = await decryptString(encryptedSettings.data, encryptedSettings.iv, cryptoKey);
          settings = JSON.parse(decryptedStr);
        }
        const suggestions = await suggestTags(ocrText, doc.name, settings);
        setSuggestedTags(suggestions.filter(t => !tags.includes(t)));
      } catch (err) {
        console.error('Failed to get tag suggestions', err);
      } finally {
        setIsAutoTagging(false);
      }
    }
    
    getSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ocrText, tags, doc.name, cryptoKey]);

  const handleAddTag = async (newTag: string) => {
    const trimmed = newTag.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    
    const updatedTags = [...tags, trimmed];
    setTags(updatedTags);
    
    try {
      const { encrypted, iv } = await encryptString(JSON.stringify(updatedTags), cryptoKey);
      const { decryptedTags, ...docToSave } = doc as any;
      await saveDocument({
        ...docToSave,
        encryptedTags: encrypted,
        tagsIv: iv
      });
      toast({
        title: language === 'id' ? `Tag "${trimmed}" ditambahkan` : `Tag "${trimmed}" added`,
        variant: "success"
      });
    } catch (err) {
      console.error('Failed to save tag', err);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const updatedTags = tags.filter(t => t !== tagToRemove);
    setTags(updatedTags);
    
    try {
      const { encrypted, iv } = await encryptString(JSON.stringify(updatedTags), cryptoKey);
      const { decryptedTags, ...docToSave } = doc as any;
      await saveDocument({
        ...docToSave,
        encryptedTags: encrypted,
        tagsIv: iv
      });
      toast({
        title: language === 'id' ? "Tag dihapus" : "Tag removed",
        variant: "success"
      });
    } catch (err) {
      console.error('Failed to remove tag', err);
    }
  };

  const exportFile = async (type: 'txt' | 'md' | 'pdf') => {
    if (!ocrText) return;
    
    if (type === 'pdf') {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF();
      const parsedPages = parseOcrPages(ocrText);
      
      parsedPages.forEach((p, index) => {
        if (index > 0) {
          pdf.addPage();
        }
        
        // Header
        pdf.setFont('courier', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(100, 116, 139); // slate-500 style
        pdf.text(`EXTRACTED TEXT - PAGE ${p.pageNumber}`, 15, 12);
        pdf.setDrawColor(226, 232, 240); // slate-200 style
        pdf.line(15, 15, 195, 15);
        
        // Text styling
        pdf.setFont('courier', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(30, 41, 59); // slate-800
        
        const lines = pdf.splitTextToSize(p.text, 180);
        let y = 22;
        for (let i = 0; i < lines.length; i++) {
          if (y > 280) {
            pdf.addPage();
            // Header for overflow page
            pdf.setFont('courier', 'bold');
            pdf.setFontSize(10);
            pdf.setTextColor(100, 116, 139);
            pdf.text(`EXTRACTED TEXT - PAGE ${p.pageNumber} (CONTINUED)`, 15, 12);
            pdf.setDrawColor(226, 232, 240);
            pdf.line(15, 15, 195, 15);
            
            pdf.setFont('courier', 'normal');
            pdf.setFontSize(9);
            pdf.setTextColor(30, 41, 59);
            y = 22;
          }
          pdf.text(lines[i], 15, y);
          y += 5.5;
        }
      });
      pdf.save(`${doc.name}-extracted.pdf`);
    } else {
      const mime = type === 'md' ? 'text/markdown' : 'text/plain';
      const blob = new Blob([ocrText], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.name}-extracted.${type}`;
      a.click();
      URL.revokeObjectURL(url);
    }
    toast({
      title: language === 'id' ? `${type.toUpperCase()} berhasil diekspor` : `${type.toUpperCase()} exported successfully`,
      variant: "success"
    });
  };

  const parsedOcrPagesList = parseOcrPages(ocrText);
  const activeOcrPageText = parsedOcrPagesList.find(p => p.pageNumber === selectedOcrPage)?.text || ocrText;

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-0 flex flex-col bg-[#F1F5F9] dark:bg-slate-950 font-sans"
    >
      <header className="flex flex-col sm:flex-row sm:h-12 shrink-0 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 sm:py-0 z-10 gap-2">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button
            onClick={onClose}
            aria-label={language === 'id' ? "Kembali ke file" : "Go back to files"}
            className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate flex-1 sm:max-w-xs">{doc.name}</h2>
        </div>
        
        <div className="flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 p-0.5 relative w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('preview')}
            className={`relative flex-1 sm:flex-none justify-center flex items-center gap-1.5 rounded px-3 py-1.5 sm:py-1 text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'preview' ? 'text-slate-800 dark:text-slate-100 font-semibold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {activeTab === 'preview' && (
              <motion.div
                layoutId="doc-active-tab"
                className="absolute inset-0 bg-white dark:bg-slate-700 rounded shadow-sm z-0"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              {t('previewTab')}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('ocr')}
            className={`relative flex-1 sm:flex-none justify-center flex items-center gap-1.5 rounded px-3 py-1.5 sm:py-1 text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'ocr' ? 'text-slate-800 dark:text-slate-100 font-semibold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {activeTab === 'ocr' && (
              <motion.div
                layoutId="doc-active-tab"
                className="absolute inset-0 bg-white dark:bg-slate-700 rounded shadow-sm z-0"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <ScanText className="h-3.5 w-3.5" />
              {t('textTab')}
            </span>
          </button>
        </div>
      </header>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            role="alert"
            className="bg-red-50 dark:bg-red-950/30 border-b border-red-100 dark:border-red-900/50 px-4 py-2 flex items-center justify-between text-xs text-red-700 dark:text-red-400 overflow-hidden"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 dark:hover:text-red-200 p-1 cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Left Pane - Document/OCR */}
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 border-r border-slate-200 dark:border-slate-800 custom-scrollbar">
          <div className="mx-auto max-w-4xl rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm overflow-hidden">
            <AnimatePresence mode="wait">
              {activeTab === 'preview' ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="min-h-[500px]"
                >
                  {doc.type.includes('pdf') ? (
                    <div ref={pdfContainerRef} className="flex flex-col items-center" />
                  ) : (
                    fileUrl && <img src={fileUrl} alt={doc.name} className="w-full rounded object-contain" />
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="ocr"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="min-h-[500px] p-1 sm:p-3 text-xs text-slate-800 dark:text-slate-200"
                >
                  {isProcessingOcr ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
                      <Loader2 className="mb-3 h-6 w-6 animate-spin" />
                      <p>
                        {useLlmForOcr
                          ? (language === 'id' ? 'Menjalankan OCR bertenaga AI...' : 'Running AI-powered optical character recognition...')
                          : (language === 'id' ? 'Menjalankan OCR lokal...' : 'Running local optical character recognition...')}
                      </p>
                    </div>
                  ) : ocrText ? (
                    <div className="flex flex-col h-full gap-4">
                      {/* OCR Toolbar */}
                      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setOcrViewMode('single')}
                            className={`px-2.5 py-1 text-[10.5px] font-bold rounded transition-colors cursor-pointer ${
                              ocrViewMode === 'single' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40' : 'border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            {language === 'id' ? 'Satu Halaman' : 'Single Page'}
                          </button>
                          <button
                            onClick={() => setOcrViewMode('all')}
                            className={`px-2.5 py-1 text-[10.5px] font-bold rounded transition-colors cursor-pointer ${
                              ocrViewMode === 'all' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40' : 'border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            {language === 'id' ? 'Semua Teks' : 'All Extracted Text'}
                          </button>
                          <button
                            onClick={handleRunOcr}
                            className="px-2.5 py-1 text-[10.5px] font-bold rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                            title={language === 'id' ? 'Jalankan ulang OCR' : 'Re-run optical character recognition'}
                          >
                            <RefreshCw className="h-3 w-3 text-indigo-500" />
                            {language === 'id' ? 'Ekstrak Ulang' : 'Redo OCR'}
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-400 mr-2">{language === 'id' ? 'Format ekspor:' : 'Export format:'}</span>
                          {(['txt', 'md', 'pdf'] as const).map(type => (
                            <button
                              key={type}
                              onClick={() => exportFile(type)}
                              className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Download className="h-3 w-3" />
                              {type.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Pagination if single view mode */}
                      {ocrViewMode === 'single' && parsedOcrPagesList.length > 1 && (
                        <div className="flex items-center gap-1.5 self-center bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800">
                          <button
                            disabled={selectedOcrPage === 1}
                            onClick={() => setSelectedOcrPage(prev => Math.max(1, prev - 1))}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 disabled:opacity-30 cursor-pointer"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </button>
                          <span className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300">
                            {language === 'id' ? `Halaman ${selectedOcrPage} dari ${parsedOcrPagesList.length}` : `Page ${selectedOcrPage} of ${parsedOcrPagesList.length}`}
                          </span>
                          <button
                            disabled={selectedOcrPage === parsedOcrPagesList.length}
                            onClick={() => setSelectedOcrPage(prev => Math.min(parsedOcrPagesList.length, prev + 1))}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 disabled:opacity-30 cursor-pointer"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Text Display Canvas */}
                      <pre className="flex-1 p-4 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 rounded border border-slate-100 dark:border-slate-800 font-mono text-[11px] leading-relaxed whitespace-pre-wrap select-text selection:bg-indigo-100 dark:selection:bg-indigo-900/50 custom-scrollbar">
                        {ocrViewMode === 'single' ? activeOcrPageText : ocrText}
                      </pre>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
                      <p className="mb-4">{t('noOcrTextHelp')}</p>
                      <button
                        onClick={handleRunOcr}
                        className="flex items-center gap-2 rounded bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 cursor-pointer"
                      >
                        <ScanText className="h-4 w-4" />
                        {t('extractTextBtn')}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {activeTab === 'preview' && !ocrText && !isProcessingOcr && (
             <div className="mx-auto mt-3 flex max-w-4xl justify-center">
                <button
                  onClick={handleRunOcr}
                  className="flex items-center gap-2 rounded bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 cursor-pointer"
                >
                  <ScanText className="h-4 w-4" />
                  {t('extractTextBtn')}
                </button>
             </div>
          )}
          
          {activeTab === 'preview' && ocrText && !isProcessingOcr && (
             <div className="mx-auto mt-3 flex max-w-4xl justify-center">
                <button
                  onClick={handleRunOcr}
                  className="flex items-center gap-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4 text-indigo-500" />
                  {t('reExtractTextBtn')}
                </button>
             </div>
          )}
        </div>

        {/* Right Pane - AI Analysis / Bottom Sheet on Mobile */}
        <motion.div 
          animate={{ 
            width: isMobile ? '100%' : (isCollapsed ? 48 : 384),
            height: isMobile ? (isCollapsed ? 44 : '60%') : '100%' 
          }}
          transition={{ type: 'spring', damping: 26, stiffness: 220 }}
          className="flex flex-col border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 relative overflow-hidden"
        >
          {/* Header Bar Toggle */}
          <div 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`flex h-11 items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors select-none shrink-0 ${
              isCollapsed ? 'lg:hidden' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-indigo-500" />
              <span className={`text-xs font-bold text-slate-700 dark:text-slate-300 ${isCollapsed ? 'lg:hidden' : ''}`}>
                {t('aiAssistantTags')}
              </span>
            </div>
            
            <div className="flex items-center gap-1.5">
              {isCollapsed ? (
                <>
                  <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-medium mr-1 lg:hidden">
                    {t('clickToExpand')}
                  </span>
                  <ChevronUp className="h-3.5 w-3.5 text-slate-500 lg:hidden" />
                  <ChevronLeft className="h-3.5 w-3.5 text-slate-500 hidden lg:block" />
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500 lg:hidden" />
                  <ChevronRight className="h-3.5 w-3.5 text-slate-500 hidden lg:block" />
                </>
              )}
            </div>
          </div>

          {/* Desktop Collapsed View */}
          {isCollapsed && (
            <div 
              onClick={() => setIsCollapsed(false)}
              className="hidden lg:flex flex-col items-center justify-center flex-1 py-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors gap-4 select-none text-slate-400 dark:text-slate-500"
            >
              <Brain className="h-5 w-5 text-indigo-500" />
              <ChevronLeft className="h-4 w-4 text-indigo-500" />
              <div className="text-[9px] font-bold uppercase tracking-widest text-center [writing-mode:vertical-lr] rotate-180 mt-2 text-slate-500 dark:text-slate-400">
                {t('expandPanel')}
              </div>
            </div>
          )}

          {/* Scrollable Content (Hidden when collapsed) */}
          <div className={`flex-1 flex flex-col overflow-y-auto custom-scrollbar ${isCollapsed ? 'hidden lg:hidden' : 'flex'}`}>
            {/* Document Tags Section */}
            <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">
                <Tag className="h-4 w-4 text-indigo-500" />
                {t('documentTags')}
              </div>
              
              <div className="flex flex-col gap-2.5">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleAddTag(tagInput);
                  setTagInput('');
                }} className="flex gap-1.5">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    placeholder={t('tagsInputPlaceholder')}
                    className="flex-1 px-2.5 py-1.5 rounded text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition-colors shadow-sm cursor-pointer border-transparent"
                  >
                    {t('addBtn')}
                  </button>
                </form>

                {tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <AnimatePresence initial={false}>
                      {tags.map(t => (
                        <motion.span 
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          key={t} 
                          className={`px-2 py-0.5 rounded border text-[10.5px] font-semibold flex items-center gap-1 group ${getTagColors(t)}`}
                        >
                          {t}
                          <button
                            onClick={() => handleRemoveTag(t)}
                            className="hover:text-red-500 transition-colors cursor-pointer font-bold text-xs"
                          >
                            &times;
                          </button>
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 italic mt-1">{t('noTagsAssigned')}</span>
                )}

                {/* Suggestions Panel */}
                {ocrText && (
                  <div className="mt-3 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('suggestedCategories')}</span>
                      {isAutoTagging && <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />}
                    </div>
                    {suggestedTags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        <AnimatePresence>
                          {suggestedTags.map(t => (
                            <motion.button
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.8, opacity: 0 }}
                              key={t}
                              onClick={() => handleAddTag(t)}
                              className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-900 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Plus className="h-3 w-3" />
                              {t}
                            </motion.button>
                          ))}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">{t('noSuggestions')}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
              <Brain className="h-4 w-4 text-indigo-500" />
              {t('aiAssistant')}
            </div>
            
            <div className="flex-1 overflow-visible lg:overflow-y-auto p-4 custom-scrollbar">
              {!ocrText ? (
                <div className="flex flex-col items-center justify-center text-center text-xs text-slate-500 dark:text-slate-400 min-h-[120px] lg:h-full">
                  <p>{t('runOcrFirstHelp')}</p>
                </div>
              ) : !summary && !isSummarizing ? (
                <div className="flex flex-col items-center justify-center text-center min-h-[160px] lg:h-full">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded bg-indigo-50 dark:bg-indigo-900/30">
                    <Sparkles className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="mb-1 text-sm font-bold text-slate-900 dark:text-slate-100">{t('insightsTitle')}</h3>
                  <p className="mb-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t('insightsSubTitle')}</p>
                  <button
                    onClick={handleSummarize}
                    className="flex w-full items-center justify-center gap-2 rounded bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 cursor-pointer border-transparent"
                  >
                    {t('generateSummaryBtn')}
                  </button>
                </div>
              ) : isSummarizing ? (
                <div className="flex items-center gap-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                  {t('processingAi')}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded p-4 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                    <ReactMarkdown
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-3 mb-1 first:mt-0 uppercase tracking-wider" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-[11px] font-bold text-slate-900 dark:text-slate-100 mt-2.5 mb-1 uppercase tracking-wider" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-[10.5px] font-semibold text-slate-800 dark:text-slate-200 mt-2 mb-1" {...props} />,
                        p: ({node, ...props}) => <p className="mb-2 last:mb-0 text-slate-700 dark:text-slate-300 leading-relaxed" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-1 text-slate-700 dark:text-slate-300" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-slate-700 dark:text-slate-300" {...props} />,
                        li: ({node, ...props}) => <li className="mb-0.5" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-slate-900 dark:text-slate-100" {...props} />,
                        code: ({node, ...props}) => <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px] font-mono text-indigo-600 dark:text-indigo-400" {...props} />,
                      }}
                    >
                      {summary}
                    </ReactMarkdown>
                  </div>
                  
                  <button
                    onClick={handleSummarize}
                    className="flex w-full items-center justify-center gap-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {t('regenerateSummaryBtn')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
