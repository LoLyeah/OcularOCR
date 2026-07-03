import { ocrPool } from './ocr-pool';
import { preprocessImage, PreprocessingOptions } from './preprocessing';

export interface RegionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function ocrRegions(
  sourceCanvas: HTMLCanvasElement,
  regions: RegionRect[],
  language: string,
  options?: PreprocessingOptions
): Promise<{ regionIndex: number; text: string }[]> {
  const crops: HTMLCanvasElement[] = [];

  for (const r of regions) {
    const crop = document.createElement('canvas');
    crop.width = r.width;
    crop.height = r.height;
    const ctx = crop.getContext('2d');
    if (ctx) {
      ctx.drawImage(sourceCanvas, r.x, r.y, r.width, r.height, 0, 0, r.width, r.height);
    }
    crops.push(crop);
  }

  const results = await ocrPool.performOCR(crops, language);

  return results.map((ret, idx) => ({
    regionIndex: idx,
    text: ret.data?.text || '',
  }));
}