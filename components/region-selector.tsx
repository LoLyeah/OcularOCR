import { useState, useRef, useCallback, useEffect } from 'react';

export interface RegionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RegionSelectorProps {
  width: number;
  height: number;
  regions: RegionRect[];
  onRegionsChange: (regions: RegionRect[]) => void;
  active: boolean;
}

export function RegionSelector({ width, height, regions, onRegionsChange, active }: RegionSelectorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });
  const [current, setCurrent] = useState({ x: 0, y: 0 });

  const redraw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    for (const r of regions) {
      ctx.strokeStyle = 'rgba(99,102,241,0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(r.x, r.y, r.width, r.height);
      ctx.fillStyle = 'rgba(99,102,241,0.12)';
      ctx.fillRect(r.x, r.y, r.width, r.height);
    }

    if (drawing) {
      const rx = Math.min(start.x, current.x);
      const ry = Math.min(start.y, current.y);
      const rw = Math.abs(current.x - start.x);
      const rh = Math.abs(current.y - start.y);
      ctx.strokeStyle = 'rgba(239,68,68,0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.fillStyle = 'rgba(239,68,68,0.1)';
      ctx.fillRect(rx, ry, rw, rh);
    }
  }, [regions, drawing, start, current, width, height]);

  useEffect(() => { redraw(); }, [redraw]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!active) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDrawing(true);
    setStart({ x, y });
    setCurrent({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrent({ x: Math.max(0, Math.min(width, x)), y: Math.max(0, Math.min(height, y)) });
  };

  const handleMouseUp = () => {
    if (!drawing) return;
    setDrawing(false);
    const rx = Math.min(start.x, current.x);
    const ry = Math.min(start.y, current.y);
    const rw = Math.abs(current.x - start.x);
    const rh = Math.abs(current.y - start.y);
    if (rw > 10 && rh > 10) {
      onRegionsChange([...regions, { x: rx, y: ry, width: rw, height: rh }]);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        inset: 0,
        cursor: active ? 'crosshair' : 'default',
        pointerEvents: active ? 'auto' : 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    />
  );
}