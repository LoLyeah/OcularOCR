import { createWorker } from 'tesseract.js';

export async function performOCR(imageSource: string | HTMLImageElement | HTMLCanvasElement): Promise<string> {
  const worker = await createWorker('eng', 1, {
    // using web worker defaults
  });
  const ret = await worker.recognize(imageSource);
  await worker.terminate();
  return ret.data.text;
}
