export async function renderPdfToCanvas(pdfData: ArrayBuffer, scale: number = 2.0): Promise<HTMLCanvasElement[]> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfData) });
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
