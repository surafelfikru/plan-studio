"use client";
import type { Tweak } from "@/types";

interface TweakTrayProps {
  tweaks: Tweak[];
  open: boolean;
  onToggle: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onSubmit: () => void;
}

export function TweakTray({ tweaks, open, onToggle, onRemove, onClear, onSubmit }: TweakTrayProps) {
  if (!tweaks.length) return null;
  return (
    <div data-sel-keep className="fixed bottom-[38px] right-[22px] z-[55]">
      {!open && (
        <button
          onClick={onToggle}
          className="flex items-center gap-2.5 rounded-[9px] border border-border2 bg-elev px-3.5 py-2.5 font-mono text-[11.5px] text-text shadow-[0_12px_34px_rgba(0,0,0,.45)] hover:border-faint"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="var(--amber)" strokeWidth="1.4">
            <path d="M11 2.5l2.5 2.5M2 14l1-3.5L11 2.5 13.5 5 5.5 13 2 14Z" />
          </svg>
          pending tweaks
          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10.5px] font-semibold" style={{ background: "var(--amber)", color: "#1a1400" }}>
            {tweaks.length}
          </span>
        </button>
      )}
      {open && (
        <div className="w-[340px] overflow-hidden rounded-[11px] border border-border2 bg-elev shadow-[0_18px_48px_rgba(0,0,0,.5)]">
          <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="var(--amber)" strokeWidth="1.4">
                <path d="M11 2.5l2.5 2.5M2 14l1-3.5L11 2.5 13.5 5 5.5 13 2 14Z" />
              </svg>
              <span className="font-mono text-[11.5px] text-text">pending tweaks</span>
              <span className="rounded border border-border px-1.5 py-px font-mono text-[10px] text-fainter">{tweaks.length}</span>
            </div>
            <button onClick={onToggle} title="Collapse" className="flex h-6 w-6 items-center justify-center rounded text-faint hover:bg-hover hover:text-text">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M3 10l5-5 5 5" />
              </svg>
            </button>
          </div>
          <div className="scroll max-h-[300px] overflow-y-auto p-2">
            {tweaks.map((tw) => (
              <div key={tw.id} className="mb-1.5 rounded-lg border border-border bg-panel2 p-2.5">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 border-l-2 border-border2 pl-2 text-[11px] leading-snug text-faint">{tw.excerpt}</div>
                    <div className="text-[12.5px] leading-snug text-text">{tw.instruction}</div>
                  </div>
                  <button
                    onClick={() => onRemove(tw.id)}
                    title="Remove"
                    className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded text-[14px] leading-none text-faint hover:bg-hover hover:text-red"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-t border-border px-3.5 py-2.5">
            <button onClick={onClear} className="rounded-md border border-border px-3 py-1.5 font-mono text-[11px] text-faint hover:bg-hover hover:text-text">
              clear all
            </button>
            <button onClick={onSubmit} className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-text px-3 py-1.5 font-mono text-[11px] font-semibold text-bg">
              submit {tweaks.length} tweaks
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M2 8h11M9 4l4 4-4 4" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
