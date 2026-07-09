"use client";
import { truncate } from "@/lib/text";
import type { SelectionState } from "@/types";

interface SelectionPopoverProps {
  sel: SelectionState;
  onAddToChat: () => void;
  onStartTweak: () => void;
  onDraftChange: (v: string) => void;
  onAddTweak: () => void;
  onCancel: () => void;
}

export function SelectionPopover({ sel, onAddToChat, onStartTweak, onDraftChange, onAddTweak, onCancel }: SelectionPopoverProps) {
  return (
    <div
      data-sel-keep
      className="fixed z-[60] -translate-x-1/2 rounded-[9px] border border-border2 bg-elev shadow-[0_14px_40px_rgba(0,0,0,.5)] [animation:fadeUp_.12s_ease]"
      style={{ left: sel.x, top: sel.y }}
    >
      {sel.mode === "actions" && (
        <div className="flex items-center gap-0.5 p-1">
          <button
            onClick={onAddToChat}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 font-mono text-[11px] text-dim hover:bg-hover hover:text-text"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M2 3.5h12v8H6l-3 2.5V11.5H2z" />
            </svg>
            add to chat
          </button>
          <div className="h-[18px] w-px bg-border" />
          <button
            onClick={onStartTweak}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 font-mono text-[11px] text-dim hover:bg-hover hover:text-text"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M11 2.5l2.5 2.5M2 14l1-3.5L11 2.5 13.5 5 5.5 13 2 14Z" />
            </svg>
            request tweak
          </button>
        </div>
      )}
      {sel.mode === "tweak" && (
        <div className="w-[312px] p-3">
          <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.05em] text-amber">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M11 2.5l2.5 2.5M2 14l1-3.5L11 2.5 13.5 5 5.5 13 2 14Z" />
            </svg>
            tweak request
          </div>
          <div className="mb-2.5 max-h-14 overflow-hidden border-l-2 border-border2 py-0.5 pl-2.5 text-[12px] leading-snug text-faint">
            “{truncate(sel.text, 140)}”
          </div>
          <textarea
            value={sel.draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder="Describe the change you want here…"
            rows={2}
            className="w-full resize-none rounded-md border border-border2 bg-bg px-2.5 py-2 font-sans text-[12.5px] leading-normal text-text outline-none"
          />
          <div className="mt-2.5 flex justify-end gap-1.5">
            <button onClick={onCancel} className="rounded-md border border-border px-3 py-1.5 font-mono text-[10.5px] text-faint hover:bg-hover hover:text-text">
              cancel
            </button>
            <button onClick={onAddTweak} className="rounded-md px-3 py-1.5 font-mono text-[10.5px] font-semibold" style={{ background: "var(--amber)", color: "#1a1400" }}>
              add tweak
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
