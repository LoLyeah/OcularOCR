'use client';

import { useState } from 'react';
import type { OcrBlock, OcrBlockType, OcrTable } from '@/lib/storage';
import { tablePlainText } from '@/lib/structured-ocr';

interface StructureEditorProps {
  pageNumber: number;
  blocks: OcrBlock[];
  onSave: (blocks: OcrBlock[]) => Promise<void> | void;
}

function tableFromText(text: string, pageNumber: number, id: string): OcrTable {
  const rows = text.split(/\r?\n/).filter(Boolean).map((line, rowIndex) => ({
    cells: line.split(/\t|\s*\|\s*/).filter((cell, index, cells) => cell || (index > 0 && index < cells.length - 1)).map((cell) => ({
      text: cell.trim(),
      ...(rowIndex === 0 ? { isHeader: true } : {}),
    })),
  })).filter((row) => row.cells.length > 0);
  return { id: `${id}-table`, pageNumber, rows: rows.length > 0 ? rows : [{ cells: [{ text: '', isHeader: true }] }], source: 'user' };
}

export function StructureEditor({ pageNumber, blocks, onSave }: StructureEditorProps) {
  const [draft, setDraft] = useState<OcrBlock[]>(blocks);
  const [isSaving, setIsSaving] = useState(false);

  const updateBlock = (index: number, update: (block: OcrBlock) => OcrBlock) => {
    setDraft((current) => current.map((block, blockIndex) => blockIndex === index ? update(block) : block));
  };
  const setType = (index: number, type: OcrBlockType) => updateBlock(index, (block) => {
    if (type === 'table') {
      const table = block.table || tableFromText(block.text, pageNumber, block.id || `page-${pageNumber}-block-${index + 1}`);
      return { ...block, type, table, text: tablePlainText(table) };
    }
    const { table: _table, ...rest } = block;
    return { ...rest, type, ...(type === 'heading' ? { level: block.level || 2 } : {}), ...(type === 'list' ? { listStyle: block.listStyle || 'unordered' } : {}) };
  });
  const move = (index: number, direction: -1 | 1) => setDraft((current) => {
    const target = index + direction;
    if (target < 0 || target >= current.length) return current;
    const next = [...current];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });

  return (
    <section aria-labelledby="structure-editor-title" className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-900/60 dark:bg-indigo-950/20">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 id="structure-editor-title" className="text-xs font-bold text-slate-800 dark:text-slate-100">Structure editor - page {pageNumber}</h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Correct reading order, block types, text, and table cells before export.</p>
        </div>
        <button
          type="button"
          disabled={isSaving}
          onClick={async () => {
            setIsSaving(true);
            try { await onSave(draft); } finally { setIsSaving(false); }
          }}
          className="rounded bg-indigo-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Apply changes'}
        </button>
      </div>

      <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
        {draft.map((block, blockIndex) => (
          <article key={block.id || blockIndex} className="rounded border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400">#{blockIndex + 1}</span>
              <label className="text-[10px] font-bold text-slate-500">
                Type
                <select
                  value={block.type}
                  onChange={(event) => setType(blockIndex, event.target.value as OcrBlockType)}
                  className="ml-1 rounded border border-slate-200 bg-white px-1.5 py-1 text-[10px] dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="text">Paragraph</option>
                  <option value="heading">Heading</option>
                  <option value="list">List</option>
                  <option value="table">Table</option>
                </select>
              </label>
              {block.type === 'heading' && (
                <label className="text-[10px] font-bold text-slate-500">Level
                  <select value={block.level || 2} onChange={(event) => updateBlock(blockIndex, (current) => ({ ...current, level: Number(event.target.value) }))} className="ml-1 rounded border border-slate-200 bg-white px-1.5 py-1 text-[10px] dark:border-slate-700 dark:bg-slate-950">
                    {[1, 2, 3, 4, 5, 6].map((level) => <option key={level} value={level}>H{level}</option>)}
                  </select>
                </label>
              )}
              {block.type === 'list' && (
                <label className="text-[10px] font-bold text-slate-500">Style
                  <select value={block.listStyle || 'unordered'} onChange={(event) => updateBlock(blockIndex, (current) => ({ ...current, listStyle: event.target.value as 'ordered' | 'unordered' }))} className="ml-1 rounded border border-slate-200 bg-white px-1.5 py-1 text-[10px] dark:border-slate-700 dark:bg-slate-950">
                    <option value="unordered">Bullets</option>
                    <option value="ordered">Numbered</option>
                  </select>
                </label>
              )}
              <div className="ml-auto flex gap-1">
                <button type="button" aria-label="Move block earlier" disabled={blockIndex === 0} onClick={() => move(blockIndex, -1)} className="rounded border px-1.5 text-xs disabled:opacity-30">↑</button>
                <button type="button" aria-label="Move block later" disabled={blockIndex === draft.length - 1} onClick={() => move(blockIndex, 1)} className="rounded border px-1.5 text-xs disabled:opacity-30">↓</button>
              </div>
            </div>

            {block.type === 'table' && block.table ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[10px]">
                  <tbody>
                    {block.table.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.cells.map((cell, cellIndex) => (
                          <td key={cellIndex} className="border border-slate-200 p-1 dark:border-slate-700">
                            <input
                              aria-label={`Row ${rowIndex + 1}, column ${cellIndex + 1}`}
                              value={cell.text}
                              onChange={(event) => updateBlock(blockIndex, (current) => {
                                if (!current.table) return current;
                                const rows = current.table.rows.map((currentRow, currentRowIndex) => ({
                                  cells: currentRow.cells.map((currentCell, currentCellIndex) => currentRowIndex === rowIndex && currentCellIndex === cellIndex ? { ...currentCell, text: event.target.value } : currentCell),
                                }));
                                const table = { ...current.table, rows, source: 'user' as const };
                                return { ...current, table, text: tablePlainText(table) };
                              })}
                              className="w-full min-w-24 bg-transparent p-1 outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <textarea
                aria-label={`Block ${blockIndex + 1} text`}
                value={block.text}
                rows={Math.min(6, Math.max(2, block.text.split('\n').length))}
                onChange={(event) => updateBlock(blockIndex, (current) => ({ ...current, text: event.target.value }))}
                className="w-full resize-y rounded border border-slate-200 bg-slate-50 p-2 text-[11px] leading-relaxed dark:border-slate-700 dark:bg-slate-950"
              />
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
