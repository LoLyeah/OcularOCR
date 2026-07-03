import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { StructuredOcrResult } from './storage';

export async function exportDocx(result: StructuredOcrResult, fileName: string): Promise<void> {
  const children: (Paragraph)[] = [];

  for (const page of result.pages) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: `Page ${page.pageNumber}`, bold: true })],
      })
    );
    const lines = page.text.split('\n');
    for (const line of lines) {
      if (line.trim()) {
        children.push(new Paragraph({ children: [new TextRun(line)] }));
      } else {
        children.push(new Paragraph({ spacing: { after: 100 }, children: [] }));
      }
    }
    children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
  }

  const doc = new Document({
    title: fileName.replace(/\.docx$/, ''),
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJson(result: StructuredOcrResult, fileName: string): void {
  const json = JSON.stringify(result, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.replace(/\.json$/, '') + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function exportSrt(result: StructuredOcrResult, fileName: string): void {
  const lines: string[] = [];
  let cueIndex = 1;
  for (const page of result.pages) {
    const text = page.text.trim();
    if (!text) continue;
    const startTime = `00:${String(Math.floor((cueIndex - 1) * 7 / 60)).padStart(2, '0')}:${String((cueIndex - 1) * 7 % 60).padStart(2, '0')},000`;
    const endTime = `00:${String(Math.floor(cueIndex * 7 / 60)).padStart(2, '0')}:${String(cueIndex * 7 % 60).padStart(2, '0')},000`;
    lines.push(String(cueIndex));
    lines.push(`${startTime} --> ${endTime}`);
    lines.push(text);
    lines.push('');
    cueIndex++;
  }
  const srt = lines.join('\n');
  const blob = new Blob([srt], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.replace(/\.srt$/, '') + '.srt';
  a.click();
  URL.revokeObjectURL(url);
}