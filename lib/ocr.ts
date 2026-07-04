import { createWorker } from 'tesseract.js';
import { ocrPool } from './ocr-pool';
import { preprocessImage, PreprocessingOptions, rotateCanvas } from './preprocessing';
import { StructuredOcrResult } from './storage';
import { parseHocr } from './hocr-parse';


async function autoRotateCanvasIfNeeded(
  canvas: HTMLCanvasElement,
  language: string,
  threshold: number,
  allAreBundled: boolean
): Promise<{ rotatedCanvas: HTMLCanvasElement; detectedRotation: number; confidence: number }> {
  // Resize to max 800px preserving aspect ratio
  const maxDim = 800;
  let sampleW = canvas.width;
  let sampleH = canvas.height;
  if (sampleW > maxDim || sampleH > maxDim) {
    if (sampleW > sampleH) {
      sampleH = Math.round((sampleH * maxDim) / sampleW);
      sampleW = maxDim;
    } else {
      sampleW = Math.round((sampleW * maxDim) / sampleH);
      sampleH = maxDim;
    }
  }

  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = sampleW;
  sampleCanvas.height = sampleH;
  const sCtx = sampleCanvas.getContext('2d');
  if (!sCtx) return { rotatedCanvas: canvas, detectedRotation: 0, confidence: 0 };
  sCtx.drawImage(canvas, 0, 0, sampleW, sampleH);

  let tempWorker;
  let bestAngle = 0;
  let bestConf = -1;
  let zeroConf = 0;

  try {
    if (allAreBundled) {
      try {
        const langPath = `${window.location.origin}/tessdata`;
        tempWorker = await createWorker(language, 1, {
          langPath,
          gzip: true,
        });
      } catch (e) {
        console.warn("Failed to create local rotation check worker, using CDN...", e);
        tempWorker = await createWorker(language, 1, {
          gzip: true,
        });
      }
    } else {
      tempWorker = await createWorker(language, 1, {
        gzip: true,
      });
    }

    // 1. Check 0 degrees (optimistic orientation check)
    const ret0 = await tempWorker.recognize(sampleCanvas);
    zeroConf = ret0.data?.confidence ?? 0;
    bestConf = zeroConf;
    bestAngle = 0;

    // If 0-degree confidence is already very high, we assume it's correct
    if (zeroConf >= 70) {
      console.log(`Auto-rotation check: 0 deg confidence is high (${zeroConf.toFixed(1)}%). Skipping other rotations.`);
    } else {
      // 2. Otherwise test 90, 180, 270 degrees cardinally
      const angles = [90, 180, 270];
      for (const angle of angles) {
        const rotatedSample = rotateCanvas(sampleCanvas, angle);
        const ret = await tempWorker.recognize(rotatedSample);
        const conf = ret.data?.confidence ?? 0;
        
        if (conf > bestConf) {
          bestConf = conf;
          bestAngle = angle;
        }
      }
    }
  } catch (err) {
    console.error("Auto-rotation check failed", err);
  } finally {
    if (tempWorker) {
      await tempWorker.terminate();
    }
  }

  // Only rotate if the best angle is cardinally different from 0,
  // its confidence is above the threshold (e.g. 3.0 threshold -> 30%),
  // and it is significantly better than 0-degree confidence by at least 15%.
  if (bestAngle !== 0 && bestConf >= threshold * 10 && (bestConf - zeroConf) >= 15) {
    console.log(`Auto-rotation applied: rotating ${bestAngle} deg (best confidence: ${bestConf.toFixed(1)}% vs 0 deg: ${zeroConf.toFixed(1)}%)`);
    const rotatedOriginal = rotateCanvas(canvas, bestAngle);
    return { rotatedCanvas: rotatedOriginal, detectedRotation: bestAngle, confidence: bestConf };
  }

  return { rotatedCanvas: canvas, detectedRotation: 0, confidence: bestConf };
}

export async function performOCR(
  imageSource: HTMLCanvasElement | HTMLImageElement | (HTMLCanvasElement | HTMLImageElement)[],
  language: string = 'eng',
  options?: PreprocessingOptions,
  onProgress?: (pageIndex: number, progress: number) => void
): Promise<StructuredOcrResult> {
  const sources = Array.isArray(imageSource) ? imageSource : [imageSource];
  
  // Determine if all requested languages are bundled
  const requestedLangs = language.split('+');
  const allAreBundled = requestedLangs.every(l => l === 'eng' || l === 'ind');

  // 1. Preprocess all pages
  const prepOpts = options || {
    enabled: false,
    grayscale: false,
    contrast: false,
    binarize: false,
    denoise: false,
    deskew: false,
    rotate: false
  };

  const preprocessedCanvases = await Promise.all(
    sources.map(async src => {
      const res = await preprocessImage(src, prepOpts);
      let finalCanvas = res.canvas;

      // Apply confidence-based auto-rotation if enabled
      if (prepOpts.enabled && prepOpts.rotate) {
        try {
          const rotationResult = await autoRotateCanvasIfNeeded(
            finalCanvas,
            language,
            prepOpts.rotationThreshold ?? 3.0,
            allAreBundled
          );
          finalCanvas = rotationResult.rotatedCanvas;
        } catch (e) {
          console.error("Auto-rotation failed for page", e);
        }
      }

      return finalCanvas;
    })
  );

  // 2. Perform parallel OCR using the worker pool
  const results = await ocrPool.performOCR(preprocessedCanvases, language, onProgress);

  // 3. Combine results
  let concatenatedText = '';
  const pages = results.map((tesseractResult, idx) => {
    const pageNum = idx + 1;
    const text = tesseractResult.data.text;
    const canvas = preprocessedCanvases[idx];
    const pageWidth = canvas?.width || 0;
    const pageHeight = canvas?.height || 0;

    const words = (tesseractResult.data.words || []).map((w: any) => ({
      text: w.text,
      bbox: {
        x0: w.bbox.x0,
        y0: w.bbox.y0,
        x1: w.bbox.x1,
        y1: w.bbox.y1
      },
      confidence: w.conf != null ? w.conf : undefined
    }));

    let lines, blocks;
    const hocr = tesseractResult.data.hocr;
    if (hocr && pageWidth > 0 && pageHeight > 0) {
      try {
        const parsed = parseHocr(hocr, pageWidth, pageHeight);
        lines = parsed.lines.length > 0 ? parsed.lines : undefined;
        blocks = parsed.blocks.length > 0 ? parsed.blocks : undefined;
      } catch (e) {
        console.warn(`hOCR parse failed for page ${pageNum}`, e);
      }
    }

    if (sources.length > 1) {
      concatenatedText += `--- PAGE ${pageNum} ---\n${text}\n\n`;
    } else {
      concatenatedText = text;
    }

    return {
      pageNumber: pageNum,
      text,
      words,
      lines,
      blocks
    };
  });

  return {
    text: concatenatedText,
    pages
  };
}

export async function performPdfOCR(
  pdfData: ArrayBuffer,
  language: string = 'eng',
  options?: PreprocessingOptions,
  pdfRenderScale: number = 2.0,
  onProgress?: (pageIndex: number, progress: number) => void
): Promise<StructuredOcrResult> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfData) });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const pages: any[] = [];
  let concatenatedText = '';

  const prepOpts = options || {
    enabled: false,
    grayscale: false,
    contrast: false,
    binarize: false,
    denoise: false,
    deskew: false,
    rotate: false
  };

  const requestedLangs = language.split('+');
  const allAreBundled = requestedLangs.every(l => l === 'eng' || l === 'ind');

  const batchSize = 4;
  for (let startPage = 1; startPage <= numPages; startPage += batchSize) {
    const endPage = Math.min(startPage + batchSize - 1, numPages);
    const batchPromises = [];

    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      const pageIndex = pageNum - 1;
      
      const processPage = async () => {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: pdfRenderScale });
        const canvas = document.createElement('canvas');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        const context = canvas.getContext('2d');
        if (!context) throw new Error(`Could not get 2D context for page ${pageNum}`);
        
        await page.render({ canvasContext: context, viewport } as any).promise;

        const prepRes = await preprocessImage(canvas, prepOpts);
        let finalCanvas = prepRes.canvas;

        if (prepOpts.enabled && prepOpts.rotate) {
          try {
            const rotationResult = await autoRotateCanvasIfNeeded(
              finalCanvas,
              language,
              prepOpts.rotationThreshold ?? 3.0,
              allAreBundled
            );
            finalCanvas = rotationResult.rotatedCanvas;
          } catch (e) {
            console.error("Auto-rotation failed for page", e);
          }
        }

        if (onProgress) onProgress(pageIndex, 0.2);
        
        const results = await ocrPool.performOCR([finalCanvas], language, (idx, prog) => {
          if (onProgress) onProgress(pageIndex, prog);
        });
        
        const tesseractResult = results[0];
        const text = tesseractResult.data.text;
        const pageWidth = finalCanvas.width;
        const pageHeight = finalCanvas.height;

        const words = (tesseractResult.data.words || []).map((w: any) => ({
          text: w.text,
          bbox: { x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 },
          confidence: w.conf != null ? w.conf : undefined
        }));

        let lines, blocks;
        const hocr = tesseractResult.data.hocr;
        if (hocr && pageWidth > 0 && pageHeight > 0) {
          try {
            const parsed = parseHocr(hocr, pageWidth, pageHeight);
            lines = parsed.lines.length > 0 ? parsed.lines : undefined;
            blocks = parsed.blocks.length > 0 ? parsed.blocks : undefined;
          } catch (e) {
            console.warn(`hOCR parse failed for page ${pageNum}`, e);
          }
        }

        // Clean up canvas memory immediately
        canvas.width = 0;
        canvas.height = 0;
        finalCanvas.width = 0;
        finalCanvas.height = 0;

        return {
          pageNumber: pageNum,
          text,
          words,
          lines,
          blocks
        };
      };

      batchPromises.push(processPage());
    }

    const batchResults = await Promise.all(batchPromises);
    pages.push(...batchResults);
  }

  pages.sort((a, b) => a.pageNumber - b.pageNumber);
  pages.forEach((p) => {
    if (numPages > 1) {
      concatenatedText += `--- PAGE ${p.pageNumber} ---\n${p.text}\n\n`;
    } else {
      concatenatedText = p.text;
    }
  });

  return {
    text: concatenatedText,
    pages
  };
}

