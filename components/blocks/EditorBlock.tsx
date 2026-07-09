"use client";

interface EditorBlockProps {
  src: string;
  rows: number;
  onInput: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function EditorBlock({ src, rows, onInput, onSave, onCancel }: EditorBlockProps) {
  return (
    <div className="my-1.5 mb-4">
      <div className="mb-2 flex items-center gap-2 font-mono text-[10.5px] text-faint">
        <span className="text-amber">●</span> editing markdown source · saves to ~/.claude/plans
      </div>
      <textarea className="ed" rows={rows} value={src} onChange={(e) => onInput(e.target.value)} />
      <div className="mt-2.5 flex gap-2">
        <button onClick={onSave} className="rounded-md bg-text px-3.5 py-1.5 font-mono text-[11px] font-semibold text-bg">
          save section
        </button>
        <button onClick={onCancel} className="rounded-md border border-border px-3.5 py-1.5 font-mono text-[11px] text-dim">
          cancel
        </button>
      </div>
    </div>
  );
}
