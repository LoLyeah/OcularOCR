import { createWorker, Worker } from 'tesseract.js';

interface PoolWorker {
  worker: Worker;
  currentLanguages: string;
  isBundledPath: boolean;
  busy: boolean;
}

class TesseractWorkerPool {
  private pool: PoolWorker[] = [];
  private maxWorkers = 4;

  constructor() {
    if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
      const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
      const memoryCap = deviceMemory !== undefined && deviceMemory <= 4 ? 2 : 4;
      // Leave one logical core available for rendering and interaction.
      this.maxWorkers = Math.min(memoryCap, Math.max(1, navigator.hardwareConcurrency - 1));
    }
  }

  /**
   * Gets an idle worker from the pool or creates a new one.
   * If the requested path type (bundled vs CDN) or languages differ, it adjusts.
   */
  private async getWorker(languages: string, allAreBundled: boolean): Promise<PoolWorker> {
    // 1. Look for an idle worker that matches the path configuration
    let poolWorker = this.pool.find(pw => !pw.busy && pw.isBundledPath === allAreBundled);
    
    if (poolWorker) {
      poolWorker.busy = true;
      // If it doesn't have the correct languages loaded, reinitialize it
      if (poolWorker.currentLanguages !== languages) {
        try {
          await poolWorker.worker.reinitialize(languages);
          poolWorker.currentLanguages = languages;
        } catch (err) {
          console.error('Failed to reinitialize worker, recreating...', err);
          // If reinitialize fails, terminate and recreate
          await poolWorker.worker.terminate();
          this.pool = this.pool.filter(pw => pw !== poolWorker);
          return this.createNewWorker(languages, allAreBundled);
        }
      }
      return poolWorker;
    }

    // Recycle an idle worker with the wrong language source instead of waiting
    // forever when the pool is full of workers from the other source.
    const recyclable = this.pool.find(pw => !pw.busy);
    if (recyclable) {
      await recyclable.worker.terminate();
      this.pool = this.pool.filter(pw => pw !== recyclable);
      return this.createNewWorker(languages, allAreBundled);
    }

    // 2. If no idle worker but pool is not full, create a new one
    if (this.pool.length < this.maxWorkers) {
      return this.createNewWorker(languages, allAreBundled);
    }

    // 3. If pool is full, wait for an idle worker of the correct path type
    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        let pw = this.pool.find(w => !w.busy && w.isBundledPath === allAreBundled);
        const recyclableWorker = !pw ? this.pool.find(w => !w.busy) : undefined;
        if (!pw && recyclableWorker) {
          clearInterval(interval);
          recyclableWorker.busy = true;
          await recyclableWorker.worker.terminate();
          this.pool = this.pool.filter(w => w !== recyclableWorker);
          resolve(await this.createNewWorker(languages, allAreBundled));
          return;
        }
        if (pw) {
          clearInterval(interval);
          pw.busy = true;
          if (pw.currentLanguages !== languages) {
            try {
              await pw.worker.reinitialize(languages);
              pw.currentLanguages = languages;
            } catch (err) {
              console.error('Failed to reinitialize worker in interval, recreating...', err);
              await pw.worker.terminate();
              this.pool = this.pool.filter(w => w !== pw);
              resolve(await this.createNewWorker(languages, allAreBundled));
              return;
            }
          }
          resolve(pw);
        }
      }, 100);
    });
  }

  private async createNewWorker(languages: string, allAreBundled: boolean): Promise<PoolWorker> {
    let worker;
    let isBundled = allAreBundled;
    
    if (allAreBundled) {
      try {
        const langPath = `${window.location.origin}/tessdata`;
        worker = await createWorker(languages, 1, {
          langPath,
          gzip: true,
        });
      } catch (err) {
        console.warn('Failed to load local bundled traineddata, falling back to CDN...', err);
        worker = await createWorker(languages, 1, {
          gzip: true,
        });
        isBundled = false;
      }
    } else {
      worker = await createWorker(languages, 1, {
        gzip: true,
      });
    }

    const newPoolWorker: PoolWorker = {
      worker,
      currentLanguages: languages,
      isBundledPath: isBundled,
      busy: true
    };
    
    this.pool.push(newPoolWorker);
    return newPoolWorker;
  }

  /**
   * Performs OCR on an array of images/canvases in parallel.
   */
  public async performOCR(
    images: (string | HTMLCanvasElement)[],
    languages: string,
    onProgress?: (pageIndex: number, progress: number) => void
  ): Promise<any[]> {
    const requestedLangs = languages.split('+');
    const allAreBundled = requestedLangs.every(l => l === 'eng' || l === 'ind');

    const results = new Array(images.length);
    
    const runTask = async (img: string | HTMLCanvasElement, index: number) => {
      const pw = await this.getWorker(languages, allAreBundled);
      try {
        if (onProgress) onProgress(index, 0.2); // worker acquired
        
        const ret = await pw.worker.recognize(img, {}, { hocr: true });
        
        if (onProgress) onProgress(index, 1.0); // done
        results[index] = ret;
      } catch (err) {
        console.error(`OCR failed on page ${index + 1}`, err);
        throw err;
      } finally {
        pw.busy = false;
      }
    };

    // Run parallel tasks
    const promises = images.map((img, i) => runTask(img, i));
    await Promise.all(promises);
    return results;
  }

  public async recognizeSequential(
    images: HTMLCanvasElement[],
    languages: string,
  ): Promise<number[]> {
    const requestedLangs = languages.split('+');
    const allAreBundled = requestedLangs.every(l => l === 'eng' || l === 'ind');
    const pw = await this.getWorker(languages, allAreBundled);
    try {
      const confidences: number[] = [];
      for (const image of images) {
        const result = await pw.worker.recognize(image);
        confidences.push(result.data?.confidence ?? 0);
      }
      return confidences;
    } finally {
      pw.busy = false;
    }
  }

  /**
   * Terminate all workers in the pool.
   */
  public async terminateAll(): Promise<void> {
    const workersToTerminate = [...this.pool];
    this.pool = []; // immediately clear pool to avoid race conditions
    
    for (const pw of workersToTerminate) {
      try {
        await pw.worker.terminate();
      } catch (err) {
        console.error('Failed to terminate worker', err);
      }
    }
  }
}

export const ocrPool = new TesseractWorkerPool();
