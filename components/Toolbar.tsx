"use client";
import type { DocMode } from "@/hooks/useDoc";

interface ToolbarProps {
  planTitle: string;
  dirty: boolean;
  mode: DocMode;
  onSetRead: () => void;
  onSetEdit: () => void;
  onReload: () => void;
  onExport: () => void;
  onOpenEditor: () => void;
}

export function Toolbar({ planTitle, dirty, mode, onSetRead, onSetEdit, onReload, onExport, onOpenEditor }: ToolbarProps) {
  const saveColor = dirty ? "var(--amber)" : "var(--green)";
  return (
    <div className="flex h-11 flex-none items-center justify-between border-b border-border px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="overflow-hidden whitespace-nowrap text-ellipsis font-mono text-[12px] text-text">{planTitle}</span>
        <span className="inline-flex items-center gap-1.5 rounded border border-border px-1.5 py-0.5 font-mono text-[10.5px]" style={{ color: saveColor }}>
          <span className="h-[5px] w-[5px] rounded-full" style={{ background: saveColor }} />
          {dirty ? "unsaved" : "saved"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex rounded-[7px] border border-border bg-panel2 p-0.5">
          <button
            onClick={onSetRead}
            className="flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-[11px]"
            style={{ background: mode === "read" ? "var(--active)" : "transparent", color: mode === "read" ? "var(--text)" : "var(--faint)" }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" />
              <circle cx="8" cy="8" r="1.8" />
            </svg>
            read
          </button>
          <button
            onClick={onSetEdit}
            className="flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-[11px]"
            style={{ background: mode === "edit" ? "var(--active)" : "transparent", color: mode === "edit" ? "var(--text)" : "var(--faint)" }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M11 2.5l2.5 2.5M2 14l1-3.5L11 2.5 13.5 5 5.5 13 2 14Z" />
            </svg>
            edit
          </button>
        </div>
        <div className="h-[18px] w-px bg-border" />
        <button onClick={onReload} title="Reload from disk" className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-border text-faint hover:bg-hover hover:text-text">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M13 8a5 5 0 1 1-1.5-3.5M13 2v3h-3" />
          </svg>
        </button>
        <button onClick={onExport} title="Export markdown" className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-border text-faint hover:bg-hover hover:text-text">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M8 2v8m0 0L5 7m3 3 3-3M2.5 13h11" />
          </svg>
        </button>
        <button onClick={onOpenEditor} className="flex h-[30px] items-center gap-1.5 rounded-md border border-border px-2.5 font-mono text-[11px] text-dim hover:bg-hover hover:text-text">
          open in editor
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M6 3H3v10h10v-3M9 3h4v4M13 3 7 9" />
          </svg>
        </button>
      </div>
    </div>
  );
}
