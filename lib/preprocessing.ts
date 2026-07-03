export interface PreprocessingOptions {
  enabled: boolean;
  grayscale: boolean;
  contrast: boolean;
  binarize: boolean;
  denoise: boolean;
  deskew: boolean;
  rotate: boolean;
  rotationThreshold?: number;
  mode?: 'auto' | 'manual' | 'off';
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

export interface ImageQuality {
  contrast: number;
  noise: number;
  sharpness: number;
}

function samplePixels(imgData: ImageData, sampleRate: number): number[] {
  const data = imgData.data;
  const pixels: number[] = [];
  const step = Math.max(1, Math.floor(Math.sqrt(sampleRate)));
  for (let y = 0; y < imgData.height; y += step) {
    for (let x = 0; x < imgData.width; x += step) {
      const idx = (y * imgData.width + x) * 4;
      pixels.push(data[idx]);
    }
  }
  return pixels;
}

export function estimateImageQuality(imgData: ImageData): ImageQuality {
  const pixels = samplePixels(imgData, 5000);
  if (pixels.length < 100) return { contrast: 0, noise: 0, sharpness: 0 };

  const mean = pixels.reduce((a, b) => a + b, 0) / pixels.length;
  const std = Math.sqrt(pixels.reduce((a, b) => a + (b - mean) ** 2, 0) / pixels.length);
  const contrast = Math.min(1, std / 128);

  let noiseSum = 0;
  let noiseCount = 0;
  const step = Math.max(1, Math.floor(Math.sqrt(pixels.length / 200)));
  for (let i = 0; i < pixels.length - 2 * step; i += step) {
    const diff = pixels[i] - pixels[i + step];
    noiseSum += diff * diff;
    noiseCount++;
  }
  const noise = Math.min(1, (noiseCount > 0 ? Math.sqrt(noiseSum / noiseCount) : 0) / 40);

  let lapSum = 0;
  let lapCount = 0;
  const w = imgData.width;
  const data = imgData.data;
  for (let y = 1; y < imgData.height - 1; y += 3) {
    for (let x = 1; x < imgData.width - 1; x += 3) {
      const idx = (y * w + x) * 4;
      const lap = Math.abs(
        4 * data[idx]
        - data[((y-1) * w + x) * 4]
        - data[((y+1) * w + x) * 4]
        - data[(y * w + (x-1)) * 4]
        - data[(y * w + (x+1)) * 4]
      );
      lapSum += lap;
      lapCount++;
    }
  }
  const sharpness = Math.min(1, (lapCount > 0 ? lapSum / lapCount : 0) / 30);

  return { contrast, noise, sharpness };
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

function percentile(values: number[], pct: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.round((pct / 100) * (sorted.length - 1));
  return sorted[idx];
}

export function applyContrastStretch(imgData: ImageData): void {
  const data = imgData.data;
  const pixels = samplePixels(imgData, 3000);
  if (pixels.length < 10) return;
  const min = percentile(pixels, 1);
  const max = percentile(pixels, 99);
  if (max <= min) return;
  const range = max - min;
  for (let i = 0; i < data.length; i += 4) {
    const v = data[i];
    const stretched = Math.round(((v - min) / range) * 255);
    data[i] = Math.max(0, Math.min(255, stretched));
    data[i + 1] = Math.max(0, Math.min(255, stretched));
    data[i + 2] = Math.max(0, Math.min(255, stretched));
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
  const longEdge = Math.max(canvas.width, canvas.height);
  const sampleSize = Math.min(longEdge, 400);
  const scale = sampleSize / longEdge;
  const sampleW = Math.round(canvas.width * scale);
  const sampleH = Math.round(canvas.height * scale);

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

function computeDeskewConfidence(canvas: HTMLCanvasElement, angle: number): number {
  if (Math.abs(angle) < 0.5) return 100;
  const longEdge = Math.max(canvas.width, canvas.height);
  const sampleSize = Math.min(longEdge, 400);
  const scale = sampleSize / longEdge;
  const sampleW = Math.round(canvas.width * scale);
  const sampleH = Math.round(canvas.height * scale);

  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = sampleW;
  sampleCanvas.height = sampleH;
  const sCtx = sampleCanvas.getContext('2d');
  if (!sCtx) return 0;
  sCtx.drawImage(canvas, 0, 0, sampleW, sampleH);

  const imgData = sCtx.getImageData(0, 0, sampleW, sampleH);
  const data = imgData.data;
  const gray = new Uint8Array(sampleW * sampleH);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = Math.round(0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]) < 128 ? 1 : 0;
  }

  const project = (a: number): number => {
    const rad = (a * Math.PI) / 180;
    const proj = new Float32Array(sampleH);
    const centerX = sampleW / 2;
    const centerY = sampleH / 2;
    for (let y = 0; y < sampleH; y++) {
      for (let x = 0; x < sampleW; x++) {
        if (gray[y * sampleW + x] === 1) {
          const ry = Math.round((x - centerX) * Math.sin(rad) + (y - centerY) * Math.cos(rad) + centerY);
          if (ry >= 0 && ry < sampleH) proj[ry]++;
        }
      }
    }
    let sum = 0;
    for (let i = 0; i < sampleH; i++) sum += proj[i];
    const m = sum / sampleH;
    let sq = 0;
    for (let i = 0; i < sampleH; i++) {
      const d = proj[i] - m;
      sq += d * d;
    }
    return sq / sampleH;
  };

  const varZero = project(0);
  const varAngle = project(angle);
  if (varZero <= 0) return 0;
  return Math.min(100, Math.round((varAngle / varZero - 1) * 50));
}

export async function preprocessImage(
  source: HTMLCanvasElement | HTMLImageElement,
  options: PreprocessingOptions
): Promise<PreprocessingResult> {
  const metadata: PreprocessingResult['metadata'] = { wasProcessed: false };

  if (!options.enabled || options.mode === 'off') {
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(source, 0, 0);
    return { canvas, metadata };
  }

  let canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { canvas, metadata };
  ctx.drawImage(source, 0, 0);
  metadata.wasProcessed = true;

  let autoGray = options.grayscale;
  let autoContrast = options.contrast;
  let autoDenoise = options.denoise;
  let autoDeskew = options.deskew;
  let autoBinarize = options.binarize;

  if (options.mode === 'auto') {
    const dCtx = canvas.getContext('2d');
    if (dCtx) {
      const imgData = dCtx.getImageData(0, 0, canvas.width, canvas.height);
      const quality = estimateImageQuality(imgData);
      autoGray = quality.contrast < 0.4 || quality.noise > 0.1;
      autoContrast = quality.contrast < 0.3;
      autoDenoise = quality.noise > 0.08;
      autoDeskew = options.deskew;
      autoBinarize = false;
    }
  }

  if (autoDeskew) {
    const angle = detectSkewAngle(canvas);
    if (Math.abs(angle) >= 1.0) {
      const confidence = computeDeskewConfidence(canvas, angle);
      if (confidence >= 20) {
        canvas = rotateCanvas(canvas, -angle);
        metadata.skewAngle = -angle;
      }
    }
  }

  const dCtx = canvas.getContext('2d');
  if (!dCtx) return { canvas, metadata };
  const imgData = dCtx.getImageData(0, 0, canvas.width, canvas.height);

  const needsGrayscale = autoGray || autoContrast || autoDenoise || autoBinarize;
  if (needsGrayscale) {
    applyGrayscale(imgData);
  }

  if (autoContrast) {
    applyContrastStretch(imgData);
  }

  if (autoDenoise) {
    applyDenoise(imgData);
  }

  if (autoBinarize) {
    applyOtsuBinarize(imgData);
  }

  dCtx.putImageData(imgData, 0, 0);
  return { canvas, metadata };
}