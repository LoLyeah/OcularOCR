export interface PreprocessingOptions {
  enabled: boolean;
  grayscale: boolean;
  contrast: boolean;
  binarize: boolean;
  denoise: boolean;
  deskew: boolean;
  rotate: boolean; // confidence-based auto-rotation
  rotationThreshold?: number; // confidence threshold (e.g. 3.0)
}

export interface PreprocessingResult {
  canvas: HTMLCanvasElement;
  metadata: {
    skewAngle?: number;
    detectedRotation?: number;
    rotationConfidence?: number;
    wasProcessed: boolean;
  };
}

export function applyGrayscale(imgData: ImageData): void {
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
}

export function applyContrastStretch(imgData: ImageData): void {
  const data = imgData.data;
  let min = 255;
  let max = 0;
  for (let i = 0; i < data.length; i += 4) {
    const v = data[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (max === min) return;
  const range = max - min;
  for (let i = 0; i < data.length; i += 4) {
    const v = data[i];
    const stretched = Math.round(((v - min) / range) * 255);
    data[i] = stretched;
    data[i + 1] = stretched;
    data[i + 2] = stretched;
  }
}

export function applyDenoise(imgData: ImageData): void {
  const width = imgData.width;
  const height = imgData.height;
  const data = imgData.data;
  const output = new Uint8ClampedArray(data.length);
  output.set(data);

  const getPixel = (x: number, y: number): number => {
    const cx = Math.max(0, Math.min(width - 1, x));
    const cy = Math.max(0, Math.min(height - 1, y));
    return data[(cy * width + cx) * 4];
  };

  const neighbors = new Uint8Array(9);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      neighbors[0] = getPixel(x - 1, y - 1);
      neighbors[1] = getPixel(x, y - 1);
      neighbors[2] = getPixel(x + 1, y - 1);
      neighbors[3] = getPixel(x - 1, y);
      neighbors[4] = getPixel(x, y);
      neighbors[5] = getPixel(x + 1, y);
      neighbors[6] = getPixel(x - 1, y + 1);
      neighbors[7] = getPixel(x, y + 1);
      neighbors[8] = getPixel(x + 1, y + 1);
      
      neighbors.sort();
      const median = neighbors[4];
      const idx = (y * width + x) * 4;
      output[idx] = median;
      output[idx + 1] = median;
      output[idx + 2] = median;
    }
  }
  data.set(output);
}

export function applyOtsuBinarize(imgData: ImageData): void {
  const data = imgData.data;
  const histogram = new Int32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    histogram[data[i]]++;
  }
  
  const total = data.length / 4;
  let sum = 0;
  for (let t = 0; t < 256; t++) {
    sum += t * histogram[t];
  }
  
  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let varMax = 0;
  let threshold = 127;
  
  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    
    wF = total - wB;
    if (wF === 0) break;
    
    sumB += t * histogram[t];
    
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    
    const varBetween = wB * wF * (mB - mF) * (mB - mF);
    
    if (varBetween > varMax) {
      varMax = varBetween;
      threshold = t;
    }
  }
  
  for (let i = 0; i < data.length; i += 4) {
    const val = data[i] >= threshold ? 255 : 0;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
  }
}

export function detectSkewAngle(canvas: HTMLCanvasElement): number {
  const sampleW = 150;
  const sampleH = 150;
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = sampleW;
  sampleCanvas.height = sampleH;
  const sCtx = sampleCanvas.getContext('2d');
  if (!sCtx) return 0;
  sCtx.fillStyle = '#ffffff';
  sCtx.fillRect(0, 0, sampleW, sampleH);
  sCtx.drawImage(canvas, 0, 0, sampleW, sampleH);
  
  const imgData = sCtx.getImageData(0, 0, sampleW, sampleH);
  const data = imgData.data;
  
  const gray = new Uint8Array(sampleW * sampleH);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = Math.round(0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]) < 128 ? 1 : 0;
  }

  let maxVar = -1;
  let bestAngle = 0;
  const angles: number[] = [];
  for (let a = -10; a <= 10; a += 0.5) {
    angles.push(a);
  }

  for (const angle of angles) {
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    
    const projections = new Float32Array(sampleH);
    const centerX = sampleW / 2;
    const centerY = sampleH / 2;
    
    for (let y = 0; y < sampleH; y++) {
      for (let x = 0; x < sampleW; x++) {
        if (gray[y * sampleW + x] === 1) {
          const ry = Math.round((x - centerX) * sin + (y - centerY) * cos + centerY);
          if (ry >= 0 && ry < sampleH) {
            projections[ry]++;
          }
        }
      }
    }
    
    let sum = 0;
    for (let i = 0; i < sampleH; i++) {
      sum += projections[i];
    }
    const mean = sum / sampleH;
    let sumSquares = 0;
    for (let i = 0; i < sampleH; i++) {
      const diff = projections[i] - mean;
      sumSquares += diff * diff;
    }
    const variance = sumSquares / sampleH;
    if (variance > maxVar) {
      maxVar = variance;
      bestAngle = angle;
    }
  }
  
  return bestAngle;
}

export function rotateCanvas(canvas: HTMLCanvasElement, angleDegrees: number): HTMLCanvasElement {
  if (Math.abs(angleDegrees) < 0.1) return canvas;
  const angleRadians = (angleDegrees * Math.PI) / 180;
  const width = canvas.width;
  const height = canvas.height;
  const absCos = Math.abs(Math.cos(angleRadians));
  const absSin = Math.abs(Math.sin(angleRadians));
  const newWidth = Math.round(width * absCos + height * absSin);
  const newHeight = Math.round(width * absSin + height * absCos);

  const newCanvas = document.createElement('canvas');
  newCanvas.width = newWidth;
  newCanvas.height = newHeight;
  const ctx = newCanvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, newWidth, newHeight);

  ctx.translate(newWidth / 2, newHeight / 2);
  ctx.rotate(angleRadians);
  ctx.drawImage(canvas, -width / 2, -height / 2);

  return newCanvas;
}

export async function preprocessImage(
  source: HTMLCanvasElement | HTMLImageElement,
  options: PreprocessingOptions
): Promise<PreprocessingResult> {
  const metadata: PreprocessingResult['metadata'] = { wasProcessed: false };
  
  if (!options.enabled) {
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(source, 0, 0);
    return { canvas, metadata };
  }

  // Work on a copy canvas
  let canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { canvas, metadata };
  ctx.drawImage(source, 0, 0);
  metadata.wasProcessed = true;

  // 1. Deskew (Hough/Projection variance)
  if (options.deskew) {
    const angle = detectSkewAngle(canvas);
    if (Math.abs(angle) >= 0.5) {
      canvas = rotateCanvas(canvas, -angle);
      metadata.skewAngle = -angle;
    }
  }

  // Pixel modifications require ImageData
  const dCtx = canvas.getContext('2d');
  if (!dCtx) return { canvas, metadata };
  const imgData = dCtx.getImageData(0, 0, canvas.width, canvas.height);

  // 2. Grayscale (prerequisite for contrast, denoise, and binarize)
  const needsGrayscale = options.grayscale || options.contrast || options.denoise || options.binarize;
  if (needsGrayscale) {
    applyGrayscale(imgData);
  }

  // 3. Contrast stretch
  if (options.contrast) {
    applyContrastStretch(imgData);
  }

  // 4. Noise reduction / Median filter
  if (options.denoise) {
    applyDenoise(imgData);
  }

  // 5. Binarize (Otsu's thresholding)
  if (options.binarize) {
    applyOtsuBinarize(imgData);
  }

  dCtx.putImageData(imgData, 0, 0);

  return { canvas, metadata };
}
