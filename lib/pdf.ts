export async function renderPdfToCanvas(pdfData: ArrayBuffer, scale: number = 2.0): Promise<HTMLCanvasElement[]> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfData.slice(0)) });
  const pdf = await loadingTask.promise;
  const canvases: HTMLCanvasElement[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (context) {
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      await page.render(renderContext as any).promise;
      canvases.push(canvas);
    }
  }
  return canvases;
}

export async function getPdfPageCount(pdfData: ArrayBuffer): Promise<number> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfData.slice(0)) });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
  await loadingTask.destroy();
  return pageCount;
}

export async function renderPdfPageToCanvas(pdfData: ArrayBuffer, pageNum: number, scale: number = 2.0): Promise<HTMLCanvasElement> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfData.slice(0)) });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) {
    throw new Error('Could not get 2D context');
  }
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  
  const renderContext = {
    canvasContext: context,
    viewport: viewport
  };
  await page.render(renderContext as any).promise;
  return canvas;
}

export async function renderPdfThumbnails(pdfData: ArrayBuffer, scale: number = 0.22): Promise<string[]> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfData.slice(0)) });
  const pdf = await loadingTask.promise;
  const thumbnails: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not create a PDF thumbnail canvas.');
      canvas.width = Math.max(1, Math.ceil(viewport.width));
      canvas.height = Math.max(1, Math.ceil(viewport.height));
      await page.render({ canvasContext: context, viewport } as any).promise;
      thumbnails.push(canvas.toDataURL('image/jpeg', 0.72));
      page.cleanup();
    }
    return thumbnails;
  } finally {
    await loadingTask.destroy();
  }
}
