import { OcrPageData, OcrWord } from '@/lib/storage';

interface OcrOverlayProps {
  pageData: OcrPageData;
  containerWidth: number;
  containerHeight: number;
  imageWidth: number;
  imageHeight: number;
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return 'rgba(34,197,94,0.25)';
  if (confidence >= 60) return 'rgba(234,179,8,0.25)';
  return 'rgba(239,68,68,0.25)';
}

function getConfidenceBorder(confidence: number): string {
  if (confidence >= 80) return 'rgba(34,197,94,0.6)';
  if (confidence >= 60) return 'rgba(234,179,8,0.6)';
  return 'rgba(239,68,68,0.6)';
}

export function OcrOverlay({ pageData, containerWidth, containerHeight, imageWidth, imageHeight }: OcrOverlayProps) {
  const scaleX = containerWidth / imageWidth;
  const scaleY = containerHeight / imageHeight;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {pageData.words.map((word, idx) => {
        if (word.confidence == null) return null;
        return (
          <div
            key={idx}
            title={`"${word.text}" (${word.confidence.toFixed(0)}%)`}
            style={{
              position: 'absolute',
              left: word.bbox.x0 * scaleX,
              top: word.bbox.y0 * scaleY,
              width: (word.bbox.x1 - word.bbox.x0) * scaleX,
              height: (word.bbox.y1 - word.bbox.y0) * scaleY,
              backgroundColor: getConfidenceColor(word.confidence),
              border: `1px solid ${getConfidenceBorder(word.confidence)}`,
              borderRadius: 1,
            }}
          />
        );
      })}
    </div>
  );
}
