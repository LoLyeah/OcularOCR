import { createWorker } from 'tesseract.js';
import { ocrPool } from './ocr-pool';
import { preprocessImage, PreprocessingOptions, rotateCanvas } from './preprocessing';
import { StructuredOcrResult } from './storage';

async function autoRotateCanvasIfNeeded(
  canvas: HTMLCanvasElement,
  language: string,
  threshold: number,
  allAreBundled: boolean
): Promise<{ rotatedCanvas: HTMLCanvasElement; detectedRotation: number; confidence: number }> {
  // Downsample to 150x150 for speed
  const sampleW = 150;
  const sampleH = 150;
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = sampleW;
  sampleCanvas.height = sampleH;
  const sCtx = sampleCanvas.getContext('2d');
  if (!sCtx) return { rotatedCanvas: canvas, detectedRotation: 0, confidence: 0 };
  sCtx.drawImage(canvas, 0, 0, sampleW, sampleH);

  // We will run Tesseract on 4 rotations using a temporary worker
  const angles = [0, 90, 180, 270];
  let bestAngle = 0;
  let bestConf = -1;

  let tempWorker;
  try {
    const langPath = allAreBundled
      ? `${window.location.origin}/tessdata`
      : undefined;
      
    tempWorker = await createWorker(language, 1, {
      langPath,
      gzip: true,
    });

    for (const angle of angles) {
      const rotatedSample = rotateCanvas(sampleCanvas, angle);
      const ret = await tempWorker.recognize(rotatedSample);
      const conf = ret.data?.confidence ?? 0;
      
      if (conf > bestConf) {
        bestConf = conf;
        bestAngle = angle;
      }
    }
  } catch (err) {
    console.error("Auto-rotation check failed", err);
  } finally {
    if (tempWorker) {
      await tempWorker.terminate();
    }
  }

  // Tesseract confidence is 0-100. threshold is 1.0-10.0.
  // Multiply threshold by 10 (e.g. 3.0 threshold -> 30% confidence).
  if (bestAngle !== 0 && bestConf >= threshold * 10) {
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
    const words = (tesseractResult.data.words || []).map((w: any) => ({
      text: w.text,
      bbox: {
        x0: w.bbox.x0,
        y0: w.bbox.y0,
        x1: w.bbox.x1,
        y1: w.bbox.y1
      }
    }));

    if (sources.length > 1) {
      concatenatedText += `--- PAGE ${pageNum} ---\n${text}\n\n`;
    } else {
      concatenatedText = text;
    }

    return {
      pageNumber: pageNum,
      text,
      words
    };
  });

  return {
    text: concatenatedText,
    pages
  };
}
