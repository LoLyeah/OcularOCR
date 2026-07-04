import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UploadCloud, File, Trash2, Search, Tag, Download, CheckSquare, Square, CheckCircle2, ScanText, Loader2, AlertTriangle, X, Link, Globe } from 'lucide-react';
import { listDocuments, saveDocument, deleteDocument, DocumentEntry, getSettings, AISettings, StructuredOcrResult } from '@/lib/storage';
import { encryptBuffer, encryptString, decryptString, decryptBuffer } from '@/lib/crypto';
import { renderPdfToCanvas, renderPdfPageToCanvas, getPdfPageCount } from '@/lib/pdf';
import { performOCR, performPdfOCR } from '@/lib/ocr';
import { extractTextFromImages, extractStructuredFromImages, StructuredOcrUnsupportedError, VisionModelUnsupportedError } from '@/lib/ai';
import { suggestTags } from '@/lib/tagger';
import { getTagColors } from '@/lib/utils';
import { useToast } from './toast';
import { useI18n } from '@/lib/i18n';
import { parseOcrPages } from './document-viewer';

interface FileManagerProps {
  cryptoKey: CryptoKey;
  onOpenDoc: (doc: DocumentEntry) => void;
}

export function FileManager({ cryptoKey, onOpenDoc }: FileManagerProps) {
  const { t, language } = useI18n();
  const [docs, setDocs] = useState<(DocumentEntry & { decryptedTags: string[] })[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState('');
  
  const [taggingDocId, setTaggingDocId] = useState<string | null>(null);
  const [newTagValue, setNewTagValue] = useState<string>('');
  const [activeSuggestions, setActiveSuggestions] = useState<string[]>([]);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [customAlert, setCustomAlert] = useState<{ title: string; message: string } | null>(null);

  const [showUrlInput, setShowUrlInput] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const loadDocs = async () => {
    const list = await listDocuments();
    const enrichedList = await Promise.all(list.map(async (doc) => {
      let decryptedTags: string[] = [];
      if (doc.encryptedTags && doc.tagsIv) {
        try {
          const tagStr = await decryptString(doc.encryptedTags, doc.tagsIv, cryptoKey);
          decryptedTags = JSON.parse(tagStr);
        } catch (e) {
          console.error('Failed to decrypt tags', e);
        }
      }
      return { ...doc, decryptedTags };
    }));
    setDocs(enrichedList);
  };

  useEffect(() => {
    let active = true;
    const fetchDocs = async () => {
      const list = await listDocuments();
      const enrichedList = await Promise.all(list.map(async (doc) => {
        let decryptedTags: string[] = [];
        if (doc.encryptedTags && doc.tagsIv) {
          try {
            const tagStr = await decryptString(doc.encryptedTags, doc.tagsIv, cryptoKey);
            decryptedTags = JSON.parse(tagStr);
          } catch (e) {
            console.error('Failed to decrypt tags', e);
          }
        }
        return { ...doc, decryptedTags };
      }));
      if (active) setDocs(enrichedList);
    };
    fetchDocs();
    return () => { active = false; };
  }, [cryptoKey]);

  const processFiles = async (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        
        // Supported types validation
        const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
        const isImage = file.type.startsWith('image/') && (
          file.type.includes('png') || file.type.includes('jpeg') || file.type.includes('webp') || file.type.includes('jpg')
        );

        if (!isPdf && !isImage) {
          setCustomAlert({
            title: language === 'id' ? "Format File Tidak Didukung" : "Unsupported File Format",
            message: language === 'id' 
              ? `"${file.name}" tidak didukung. Silakan unggah PDF atau gambar PNG/JPEG/WebP.` 
              : `"${file.name}" is not supported. Please upload PDFs or PNG/JPEG/WebP images.`
          });
          continue;
        }

        const buffer = await file.arrayBuffer();
        const { encrypted, iv } = await encryptBuffer(buffer, cryptoKey);
        
        const doc: DocumentEntry = {
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type || 'application/octet-stream',
          createdAt: Date.now(),
          iv,
          encryptedData: encrypted,
        };
        await saveDocument(doc);
        successCount++;
      }
      await loadDocs();
      if (successCount > 0) {
        toast({
          title: language === 'id' 
            ? `${successCount} file berhasil dienkripsi & disimpan`
            : successCount === 1 ? "File encrypted & stored" : `${successCount} files encrypted & stored`,
          variant: "success"
        });
      }
    } catch (err) {
      console.error('Upload failed', err);
      toast({
        title: language === 'id' ? "Gagal mengunggah" : "Upload failed",
        description: language === 'id' 
          ? "Gagal mengenkripsi dan menyimpan dokumen secara lokal."
          : "Failed to encrypt and save the documents locally.",
        variant: "error"
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      await processFiles(files);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
  };

  const handleImportFromUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!downloadUrl || !downloadUrl.trim()) return;
    
    setIsDownloading(true);
    try {
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(downloadUrl.trim())}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error || `Server returned status ${response.status}`);
      }
      
      const blob = await response.blob();
      const contentType = blob.type || 'application/octet-stream';
      
      let fileName = 'Downloaded_File';
      try {
        const urlObj = new URL(downloadUrl.trim());
        const pathname = urlObj.pathname;
        const lastPart = pathname.substring(pathname.lastIndexOf('/') + 1);
        if (lastPart && lastPart.includes('.')) {
          fileName = decodeURIComponent(lastPart);
        } else {
          if (contentType.includes('pdf')) fileName = 'document.pdf';
          else if (contentType.includes('webp')) fileName = 'image.webp';
          else if (contentType.includes('png')) fileName = 'image.png';
          else if (contentType.includes('jpeg') || contentType.includes('jpg')) fileName = 'image.jpg';
        }
      } catch (err) {
        console.error('Failed to parse filename from URL', err);
      }
      
      const buffer = await blob.arrayBuffer();
      const { encrypted, iv } = await encryptBuffer(buffer, cryptoKey);
      
      const doc: DocumentEntry = {
        id: crypto.randomUUID(),
        name: fileName,
        type: contentType,
        createdAt: Date.now(),
        iv,
        encryptedData: encrypted,
      };
      
      await saveDocument(doc);
      setDownloadUrl('');
      setShowUrlInput(false);
      await loadDocs();
      toast({
        title: language === 'id' ? "File berhasil diunduh & dienkripsi" : "File downloaded & encrypted",
        variant: "success"
      });
    } catch (err: any) {
      console.error('Import from URL failed', err);
      toast({
        title: language === 'id' ? "Gagal mengimpor" : "Import failed",
        description: err.message || (language === 'id' ? "Gagal mengunduh dan mengenkripsi file." : "Failed to download and encrypt file."),
        variant: "error"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteConfirmId(id);
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteDocument(deleteConfirmId);
      const newSelected = new Set(selectedDocs);
      newSelected.delete(deleteConfirmId);
      setSelectedDocs(newSelected);
      await loadDocs();
      toast({
        title: language === 'id' ? "Dokumen berhasil dihapus" : "Document deleted",
        variant: "success"
      });
    } catch (err: any) {
      toast({
        title: language === 'id' ? "Gagal menghapus" : "Delete failed",
        description: err.message || (language === 'id' ? "Terjadi kesalahan saat menghapus file." : "An error occurred while deleting the file."),
        variant: "error"
      });
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const executeBulkDelete = async () => {
    const totalCount = selectedDocs.size;
    setIsProcessingBulk(true);
    setBulkProgress(language === 'id' ? `Menghapus ${totalCount} dokumen...` : `Deleting ${totalCount} documents...`);
    try {
      for (const id of Array.from(selectedDocs)) {
        await deleteDocument(id);
      }
      setSelectedDocs(new Set());
      await loadDocs();
      toast({
        title: language === 'id' ? `${totalCount} dokumen berhasil dihapus` : `${totalCount} documents deleted`,
        variant: "success"
      });
    } catch (err: any) {
      toast({
        title: language === 'id' ? "Gagal menghapus masal" : "Bulk delete failed",
        description: err.message || (language === 'id' ? "Terjadi kesalahan saat menghapus." : "An error occurred while deleting."),
        variant: "error"
      });
    } finally {
      setIsProcessingBulk(false);
      setBulkProgress('');
      setShowBulkDeleteConfirm(false);
    }
  };

  const handleToggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSet = new Set(selectedDocs);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedDocs(newSet);
  };

  const handleToggleSelectAll = () => {
    if (selectedDocs.size === filteredDocs.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(filteredDocs.map(d => d.id)));
    }
  };

  const submitTag = async (e: React.FormEvent, doc: DocumentEntry & { decryptedTags: string[] }) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!newTagValue || !newTagValue.trim()) {
      setTaggingDocId(null);
      return;
    }
    
    const tagToAdd = newTagValue.trim();
    const newTags = [...new Set([...(doc.decryptedTags || []), tagToAdd])];
    const { encrypted, iv } = await encryptString(JSON.stringify(newTags), cryptoKey);
    
    const { decryptedTags, ...docToSave } = doc;
    await saveDocument({
      ...docToSave,
      encryptedTags: encrypted,
      tagsIv: iv
    });
    setTaggingDocId(null);
    setNewTagValue('');
    await loadDocs();
    toast({
      title: language === 'id' ? `Tag "${tagToAdd}" ditambahkan` : `Tag "${tagToAdd}" added`,
      variant: "success"
    });
  };
  
  const handleRemoveTag = async (e: React.MouseEvent, doc: DocumentEntry & { decryptedTags: string[] }, tagToRemove: string) => {
    e.stopPropagation();
    e.preventDefault();
    const newTags = (doc.decryptedTags || []).filter(t => t !== tagToRemove);
    const { encrypted, iv } = await encryptString(JSON.stringify(newTags), cryptoKey);
    
    const { decryptedTags, ...docToSave } = doc;
    await saveDocument({
      ...docToSave,
      encryptedTags: encrypted,
      tagsIv: iv
    });
    await loadDocs();
    toast({
      title: language === 'id' ? "Tag dihapus" : "Tag removed",
      variant: "success"
    });
  };

  const handleStartTagging = async (e: React.MouseEvent, doc: DocumentEntry & { decryptedTags: string[] }) => {
    e.stopPropagation();
    e.preventDefault();
    setTaggingDocId(doc.id);
    setNewTagValue('');
    setActiveSuggestions([]);

    if (doc.encryptedOcrText && doc.ocrTextIv) {
      try {
        const ocrText = await decryptString(doc.encryptedOcrText, doc.ocrTextIv, cryptoKey);
        const { suggestTagsLocal } = await import('@/lib/tagger');
        const suggestions = suggestTagsLocal(ocrText, doc.name);
        const filtered = suggestions.filter(t => !doc.decryptedTags.includes(t));
        setActiveSuggestions(filtered);
      } catch (err) {
        console.error('Failed to get tags for UI suggestion', err);
      }
    }
  };

  const handleAddSuggestedTag = async (e: React.MouseEvent, doc: DocumentEntry & { decryptedTags: string[] }, tag: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    const newTags = [...new Set([...(doc.decryptedTags || []), tag])];
    const { encrypted, iv } = await encryptString(JSON.stringify(newTags), cryptoKey);
    
    const { decryptedTags, ...docToSave } = doc;
    await saveDocument({
      ...docToSave,
      encryptedTags: encrypted,
      tagsIv: iv
    });
    setTaggingDocId(null);
    await loadDocs();
    toast({
      title: language === 'id' ? `Tag "${tag}" ditambahkan` : `Tag "${tag}" added`,
      variant: "success"
    });
  };

  const handleBulkAutoTag = async () => {
    const docsToProcess = docs.filter(d => selectedDocs.has(d.id));
    if (docsToProcess.length === 0) return;

    const docsWithOcr = docsToProcess.filter(d => d.encryptedOcrText && d.ocrTextIv);
    if (docsWithOcr.length === 0) {
      setCustomAlert({
        title: language === 'id' ? "Pemberitahuan Auto-Tagging" : "Auto-Tagging Notice",
        message: language === 'id' 
          ? "Tidak ada dokumen yang dipilih yang memiliki data OCR. Silakan jalankan OCR terlebih dahulu."
          : "None of the selected documents have extracted OCR data. Please run OCR on them first."
      });
      return;
    }

    setIsProcessingBulk(true);
    setBulkProgress(language === 'id' ? `Menganalisis dan auto-tagging ${docsWithOcr.length} dokumen...` : `Analyzing and auto-tagging ${docsWithOcr.length} documents...`);

    try {
      const encryptedSettings = await getSettings();
      let settings: AISettings | undefined;
      if (encryptedSettings) {
        const decryptedStr = await decryptString(encryptedSettings.data, encryptedSettings.iv, cryptoKey);
        settings = JSON.parse(decryptedStr);
      }

      for (let i = 0; i < docsWithOcr.length; i++) {
        const doc = docsWithOcr[i];
        setBulkProgress(language === 'id' ? `Auto-tagging ${i + 1} dari ${docsWithOcr.length}: ${doc.name}` : `Auto-tagging ${i + 1} of ${docsWithOcr.length}: ${doc.name}`);

        try {
          const ocrText = await decryptString(doc.encryptedOcrText!, doc.ocrTextIv!, cryptoKey);
          const suggested = await suggestTags(ocrText, doc.name, settings);
          const mergedTags = Array.from(new Set([...(doc.decryptedTags || []), ...suggested]));
          
          const { encrypted: encryptedTags, iv: tagsIv } = await encryptString(JSON.stringify(mergedTags), cryptoKey);
          
          const { decryptedTags, ...docToSave } = doc;
          await saveDocument({
            ...docToSave,
            encryptedTags: encryptedTags,
            tagsIv
          });
        } catch (e) {
          console.error(`Auto-tagging failed for ${doc.name}`, e);
        }
      }

      await loadDocs();
      toast({
        title: language === 'id' ? `Auto-tagging selesai untuk ${docsWithOcr.length} dokumen` : `Auto-tagged ${docsWithOcr.length} documents`,
        variant: "success"
      });
    } catch (err: any) {
      toast({
        title: language === 'id' ? "Gagal melakukan auto-tagging" : "Auto-tagging failed",
        description: err.message || (language === 'id' ? "Terjadi kesalahan saat auto-tagging massal." : "An unexpected error occurred during bulk auto-tagging."),
        variant: "error"
      });
    } finally {
      setIsProcessingBulk(false);
      setBulkProgress('');
      setSelectedDocs(new Set());
    }
  };

  const handleBulkExport = async () => {
    const docsToExport = docs.filter(d => selectedDocs.has(d.id) && d.encryptedOcrText && d.ocrTextIv);
    if (docsToExport.length === 0) {
      setCustomAlert({
        title: language === 'id' ? "Pemberitahuan Ekspor" : "Export Notice",
        message: language === 'id' 
          ? "Tidak ada dokumen yang dipilih yang memiliki data OCR. Ekspor dibatalkan."
          : "None of the selected documents have extracted OCR data. Export cancelled."
      });
      return;
    }

    setIsProcessingBulk(true);
    setBulkProgress(language === 'id' ? `Menghasilkan PDF gabungan untuk ${docsToExport.length} file...` : `Generating unified PDF for ${docsToExport.length} files...`);

    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF();

      for (let i = 0; i < docsToExport.length; i++) {
        const doc = docsToExport[i];
        if (i > 0) pdf.addPage();

        pdf.setFontSize(16);
        pdf.text(`Document: ${doc.name}`, 15, 20);
        pdf.setFontSize(10);

        const ocrText = await decryptString(doc.encryptedOcrText!, doc.ocrTextIv!, cryptoKey);
        const lines = pdf.splitTextToSize(ocrText, 180);

        let y = 30;
        for (let j = 0; j < lines.length; j++) {
          if (y > 280) {
            pdf.addPage();
            y = 20;
          }
          pdf.text(lines[j], 15, y);
          y += 5;
        }
      }

      pdf.save(`vault-bulk-export-${Date.now()}.pdf`);
      toast({
        title: t('pdfExportSuccessToast'),
        variant: "success"
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: t('pdfExportFailedToast'),
        description: err.message || "An unexpected error occurred during PDF generation.",
        variant: "error"
      });
    } finally {
      setIsProcessingBulk(false);
      setBulkProgress('');
      setSelectedDocs(new Set());
    }
  };

  const handleBulkOcr = async () => {
    const docsToProcess = docs.filter(d => selectedDocs.has(d.id));
    if (docsToProcess.length === 0) return;

    setIsProcessingBulk(true);
    setBulkProgress(language === 'id' ? `Menjalankan OCR untuk ${docsToProcess.length} dokumen...` : `Running OCR for ${docsToProcess.length} documents...`);

    try {
      const encryptedSettings = await getSettings();
      let settings: AISettings | undefined;
      if (encryptedSettings) {
        const decryptedStr = await decryptString(encryptedSettings.data, encryptedSettings.iv, cryptoKey);
        settings = JSON.parse(decryptedStr);
      }

      let successCount = 0;
      for (let i = 0; i < docsToProcess.length; i++) {
        const doc = docsToProcess[i];
        setBulkProgress(language === 'id' ? `Memproses ${i + 1} dari ${docsToProcess.length}: ${doc.name}` : `Processing ${i + 1} of ${docsToProcess.length}: ${doc.name}`);

        try {
          const decryptedBuffer = await decryptBuffer(doc.encryptedData, doc.iv, cryptoKey);
          let finalOcrText = '';
          let ocrResultToSave = '';

          const prepOpts = {
            enabled: settings?.enablePreprocessing ?? true,
            grayscale: settings?.preprocessingGrayscale ?? true,
            contrast: settings?.preprocessingContrast ?? true,
            binarize: settings?.preprocessingBinarize ?? false,
            denoise: settings?.preprocessingDenoise ?? false,
            deskew: settings?.preprocessingDeskew ?? false,
            rotate: settings?.preprocessingRotate ?? true,
            rotationThreshold: settings?.rotationThreshold ?? 3.0
          };

          if (doc.type.includes('pdf')) {
            const pageCount = await getPdfPageCount(decryptedBuffer);
            const renderScale = settings?.pdfRenderScale ?? 2.0;

            if (settings?.useLlmForOcr) {
              const pagesData: any[] = [];
              const useStructured = settings?.structuredLlmOcr;

              for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
                const canvas = await renderPdfPageToCanvas(decryptedBuffer, pageNum, renderScale);
                const imgBase64 = canvas.toDataURL('image/jpeg', 0.8);
                const w = canvas.width;
                const h = canvas.height;
                canvas.width = 0;
                canvas.height = 0;

                if (useStructured) {
                  try {
                    const pageDimensions = [{ width: w, height: h }];
                    const structuredRes = await extractStructuredFromImages([imgBase64], settings!, pageDimensions);
                    const pageObj = structuredRes.pages[0];
                    if (pageObj) {
                      pageObj.pageNumber = pageNum;
                      pagesData.push(pageObj);
                    }
                  } catch (err) {
                    if (err instanceof StructuredOcrUnsupportedError) {
                      const text = await extractTextFromImages([imgBase64], settings!);
                      pagesData.push({
                        pageNumber: pageNum,
                        text,
                        words: []
                      });
                    } else {
                      throw err;
                    }
                  }
                } else {
                  const text = await extractTextFromImages([imgBase64], settings!);
                  pagesData.push({
                    pageNumber: pageNum,
                    text,
                    words: []
                  });
                }
              }

              pagesData.sort((a, b) => a.pageNumber - b.pageNumber);
              finalOcrText = pagesData.map((p) => {
                if (pageCount > 1) {
                  return `--- PAGE ${p.pageNumber} ---\n${p.text}`;
                }
                return p.text;
              }).join('\n\n') + '\n\n';

              const structuredResult: StructuredOcrResult = {
                text: finalOcrText,
                pages: pagesData
              };
              ocrResultToSave = JSON.stringify(structuredResult);
            } else {
              const languages = settings?.ocrLanguages?.join('+') || 'eng';
              const ocrResult = await performPdfOCR(decryptedBuffer, languages, prepOpts, renderScale);
              finalOcrText = ocrResult.text;
              ocrResultToSave = JSON.stringify(ocrResult);
            }
          } else {
            const blob = new Blob([decryptedBuffer], { type: doc.type });
            const url = URL.createObjectURL(blob);
            const img = document.createElement('img');
            img.src = url;
            await new Promise(resolve => img.onload = resolve);
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.getContext('2d')?.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            
            const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);

            if (settings?.useLlmForOcr) {
              if (settings?.structuredLlmOcr) {
                try {
                  const pageDimensions = [{ width: canvas.width, height: canvas.height }];
                  const structuredResult = await extractStructuredFromImages([imageBase64], settings, pageDimensions);
                  finalOcrText = structuredResult.text;
                  ocrResultToSave = JSON.stringify(structuredResult);
                } catch (err) {
                  if (err instanceof StructuredOcrUnsupportedError) {
                    finalOcrText = await extractTextFromImages([imageBase64], settings);
                    const parsedResult = {
                      text: finalOcrText,
                      pages: [{ pageNumber: 1, text: finalOcrText, words: [] }]
                    };
                    ocrResultToSave = JSON.stringify(parsedResult);
                  } else {
                    throw err;
                  }
                }
              } else {
                finalOcrText = await extractTextFromImages([imageBase64], settings);
                const parsedResult = {
                  text: finalOcrText,
                  pages: [{ pageNumber: 1, text: finalOcrText, words: [] }]
                };
                ocrResultToSave = JSON.stringify(parsedResult);
              }
            } else {
              const languages = settings?.ocrLanguages?.join('+') || 'eng';
              const ocrResult = await performOCR([canvas], languages, prepOpts);
              finalOcrText = ocrResult.text;
              ocrResultToSave = JSON.stringify(ocrResult);
            }
          }

          const { encrypted, iv } = await encryptString(ocrResultToSave, cryptoKey);
          
          let encryptedTags = doc.encryptedTags;
          let tagsIv = doc.tagsIv;
          
          try {
            if (settings?.autoTagStrategy !== 'none') {
              const suggested = await suggestTags(finalOcrText, doc.name, settings);
              const mergedTags = Array.from(new Set([...(doc.decryptedTags || []), ...suggested]));
              const tagEncryption = await encryptString(JSON.stringify(mergedTags), cryptoKey);
              encryptedTags = tagEncryption.encrypted;
              tagsIv = tagEncryption.iv;
            }
          } catch (tagErr) {
            console.error(`Auto-tagging failed for ${doc.name}`, tagErr);
          }

          const { decryptedTags, ...docToSave } = doc;
          await saveDocument({
            ...docToSave,
            encryptedOcrText: encrypted,
            ocrTextIv: iv,
            encryptedTags,
            tagsIv
          });
          successCount++;
        } catch (e) {
          console.error(`OCR failed for ${doc.name}`, e);
        }
      }
      
      await loadDocs();
      toast({
        title: language === 'id' ? `OCR selesai untuk ${successCount} dokumen` : `OCR completed for ${successCount} documents`,
        variant: "success"
      });
    } catch (err: any) {
      if (err instanceof VisionModelUnsupportedError) {
        toast({
          title: language === 'id' ? 'Model Tidak Mendukung Vision' : 'Model Does Not Support Vision',
          description: err.message,
          variant: "info"
        });
      } else {
        toast({
          title: language === 'id' ? "OCR massal gagal" : "Bulk OCR failed",
          description: err.message || "An unexpected error occurred during bulk processing.",
          variant: "error"
        });
      }
    } finally {
      setIsProcessingBulk(false);
      setBulkProgress('');
      setSelectedDocs(new Set());
    }
  };

  const filteredDocs = docs.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.decryptedTags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="h-full w-full overflow-hidden flex flex-col bg-white dark:bg-slate-900 relative animate-none"
    >
      <AnimatePresence>
        {isDragging && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-indigo-50/95 dark:bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="border-2 border-dashed border-indigo-500 dark:border-indigo-400 w-full h-full rounded-xl flex flex-col items-center justify-center p-8 pointer-events-none">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <UploadCloud className="h-8 w-8 animate-bounce" />
              </div>
              <p className="text-base font-bold text-indigo-900 dark:text-indigo-200">
                {t('dropFilesTitle')}
              </p>
              <p className="mt-2 text-xs text-indigo-500 dark:text-indigo-400">
                {t('supportedFormatsText')}
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-[10.5px] bg-indigo-100/50 dark:bg-indigo-950/30 px-3 py-1 rounded text-indigo-700 dark:text-indigo-300 font-mono">
                <span>{t('clientSidePrivateInfo')}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-3 flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 gap-2.5">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('yourSecureDocsTitle')}</h2>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <input 
            type="text" 
            placeholder={t('searchVaultPlaceholder')} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-white px-3 py-1.5 rounded flex-1 md:w-64 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={() => setShowUrlInput(!showUrlInput)}
            className={`px-3 py-1.5 text-xs font-bold rounded shadow-sm flex items-center gap-2 border transition-colors cursor-pointer ${
              showUrlInput 
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700' 
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
            }`}
          >
            <Link className="h-3 w-3" />
            {t('addFromUrlBtn')}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                {t('encryptingText')}
              </>
            ) : (
              <>
                <UploadCloud className="h-3 w-3" />
                {t('importFileBtn')}
              </>
            )}
          </button>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden" 
            accept=".pdf,image/png,image/jpeg,image/webp"
            multiple
          />
        </div>
      </div>

      <AnimatePresence>
        {showUrlInput && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 overflow-hidden"
          >
            <div className="p-3">
              <form onSubmit={handleImportFromUrl} className="flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto">
                <div className="relative flex-1">
                  <Globe className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                  <input
                    type="url"
                    required
                    placeholder={t('enterDirectLinkPlaceholder')}
                    value={downloadUrl}
                    onChange={e => setDownloadUrl(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-white rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isDownloading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {t('importing')}
                    </>
                  ) : (
                    t('downloadEncryptBtn')
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        <AnimatePresence>
          {isProcessingBulk && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm"
            >
              <div className="flex flex-col items-center bg-white dark:bg-slate-900 p-6 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800">
                <Loader2 className="h-8 w-8 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{t('processingDocsTitle')}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{bulkProgress}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {docs.length === 0 ? (
          <div className="mt-16 px-4 flex flex-col items-center justify-center">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="max-w-lg mx-auto w-full border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group animate-none"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-950 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                <UploadCloud className="h-7 w-7" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {t('dragDropOrClickHelp')}
              </p>
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                {t('supportsPdfImagesHelp')}
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-500 dark:text-slate-400 font-mono">
                <span>{t('clientSideEncryptionBadge')}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <AnimatePresence>
              {selectedDocs.size > 0 && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="sticky top-0 bg-indigo-50 dark:bg-indigo-900/30 border-b border-indigo-100 dark:border-indigo-800/50 z-20 overflow-hidden"
                >
                  <div className="px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                      {t('selectedCountText', { count: selectedDocs.size })}
                    </span>
                    <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                      <button onClick={handleBulkOcr} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300 rounded text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-800 transition-colors shadow-sm cursor-pointer">
                        <ScanText className="h-3.5 w-3.5" /> {t('bulkOcrBtn')}
                      </button>
                      <button onClick={handleBulkAutoTag} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300 rounded text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-800 transition-colors shadow-sm cursor-pointer">
                        <Tag className="h-3.5 w-3.5" /> {t('autoTagBtn')}
                      </button>
                      <button onClick={handleBulkExport} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300 rounded text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-800 transition-colors shadow-sm cursor-pointer">
                        <Download className="h-3.5 w-3.5" /> {t('exportPdfBtn')}
                      </button>
                      <button onClick={() => setShowBulkDeleteConfirm(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 rounded text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors shadow-sm cursor-pointer">
                        <Trash2 className="h-3.5 w-3.5" /> {t('bulkDeleteBtn')}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white dark:bg-slate-900 shadow-sm z-10">
                <tr className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-2 w-10">
                    <button onClick={handleToggleSelectAll} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">
                      {selectedDocs.size === filteredDocs.length && filteredDocs.length > 0 ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-2">{t('fileNameCol')}</th>
                  <th className="px-4 py-2">{t('tagsCol')}</th>
                  <th className="px-4 py-2">{t('statusCol')}</th>
                  <th className="px-4 py-2 hidden md:table-cell">{t('typeCol')}</th>
                  <th className="px-4 py-2 hidden md:table-cell">{t('dateImportedCol')}</th>
                  <th className="px-4 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="text-xs">
                <AnimatePresence initial={false}>
                  {filteredDocs.map((doc) => (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      key={doc.id}
                      onClick={() => onOpenDoc(doc)}
                      className={`border-b border-slate-50 dark:border-slate-800/50 cursor-pointer bg-white dark:bg-slate-900 transition-colors ${selectedDocs.has(doc.id) ? 'bg-indigo-50/30 dark:bg-indigo-900/20 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                    >
                      <td className="px-4 py-3" onClick={(e) => handleToggleSelect(e, doc.id)}>
                        {selectedDocs.has(doc.id) ? (
                          <CheckSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-2">
                          <span className={doc.type.includes('pdf') ? 'text-red-500 dark:text-red-400' : 'text-blue-500 dark:text-blue-400'}>
                            <File className="h-4 w-4" />
                          </span> 
                          {doc.name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          <AnimatePresence initial={false}>
                            {doc.decryptedTags?.map(t => (
                              <motion.span 
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                key={t} 
                                className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold flex items-center gap-1 group ${getTagColors(t)}`}
                              >
                                {t}
                                <button onClick={(e) => handleRemoveTag(e, doc, t)} className="hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                  &times;
                                </button>
                              </motion.span>
                            ))}
                          </AnimatePresence>
                          {taggingDocId === doc.id ? (
                            <div className="flex flex-col gap-1.5 bg-slate-50 dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 shadow-md z-30 min-w-[150px] absolute animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
                              <form onSubmit={(e) => submitTag(e, doc)} className="flex items-center gap-1">
                                <input 
                                  autoFocus
                                  value={newTagValue}
                                  onChange={e => setNewTagValue(e.target.value)}
                                  placeholder={t('tagsInputPlaceholder')}
                                  className="px-1.5 py-0.5 rounded text-[10px] text-slate-700 dark:text-slate-200 border border-indigo-300 dark:border-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full bg-white dark:bg-slate-900"
                                  onBlur={() => setTimeout(() => setTaggingDocId(null), 200)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') setTaggingDocId(null);
                                  }}
                                />
                              </form>
                              {activeSuggestions.length > 0 && (
                                <div className="flex flex-col gap-1 mt-1 border-t border-slate-200 dark:border-slate-700 pt-1.5">
                                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-left">Suggested:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {activeSuggestions.map(t => (
                                      <button
                                        key={t}
                                        onClick={(e) => handleAddSuggestedTag(e, doc, t)}
                                        className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-900 text-[9px] text-indigo-600 dark:text-indigo-400 font-medium transition-colors cursor-pointer text-left"
                                      >
                                        + {t}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <button onClick={(e) => handleStartTagging(e, doc)} className="px-1.5 py-0.5 rounded text-[10px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 border border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 cursor-pointer">
                              + tag
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          doc.encryptedSummary ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 
                          doc.encryptedOcrText ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                          {doc.encryptedSummary ? (language === 'id' ? 'RINGKASAN' : 'SUMMARIZED') : doc.encryptedOcrText ? (language === 'id' ? 'TERINDEKS' : 'INDEXED') : (language === 'id' ? 'DISIMPAN' : 'STORED')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider hidden md:table-cell">
                        {doc.type.split('/')[1] || 'FILE'}
                      </td>
                      <td className="px-4 py-3 text-slate-400 dark:text-slate-500 hidden md:table-cell">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => handleDeleteClick(e, doc.id)}
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400 rounded cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t('deleteDocSingleTitle')}?</h3>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {language === 'id' 
                      ? `Apakah Anda yakin ingin menghapus "${docs.find(d => d.id === deleteConfirmId)?.name}"? Tindakan ini tidak dapat dibatalkan dan file terenkripsi akan dihancurkan.`
                      : `Are you sure you want to delete "${docs.find(d => d.id === deleteConfirmId)?.name}"? This action is irreversible and the encrypted data will be destroyed.`}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2 text-xs">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition-colors cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={executeDelete}
                  className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white font-bold transition-colors shadow-sm cursor-pointer border-transparent"
                >
                  {t('deleteDocSingleConfirmBtn')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirmation Modal */}
      <AnimatePresence>
        {showBulkDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {t('bulkDeleteConfirmTitle', { count: selectedDocs.size })}
                  </h3>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {t('bulkDeleteConfirmDesc', { count: selectedDocs.size })}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2 text-xs">
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition-colors cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={executeBulkDelete}
                  className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white font-bold transition-colors shadow-sm cursor-pointer border-transparent"
                >
                  {t('deleteDocsConfirmBtn')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Alert Modal */}
      <AnimatePresence>
        {customAlert && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xl"
            >
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-2">
                <AlertTriangle className="h-4 w-4" />
                <h3 className="text-sm font-bold">{customAlert.title}</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                {customAlert.message}
              </p>
              <div className="flex justify-end text-xs">
                <button
                  onClick={() => setCustomAlert(null)}
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors shadow-sm cursor-pointer"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
