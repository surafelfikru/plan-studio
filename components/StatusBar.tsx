"use client";

interface StatusBarProps {
  planFile: string;
  dirty: boolean;
  lastSaved: string;
  errors: number;
  wordCount: number;
}

export function StatusBar({ planFile, dirty, lastSaved, errors, wordCount }: StatusBarProps) {
  const saveColor = dirty ? "var(--amber)" : "var(--green)";
  const errColor = errors > 0 ? "var(--red)" : "var(--faint)";
  return (
    <div className="flex h-[26px] flex-none items-center justify-between border-t border-border bg-panel px-3.5 font-mono text-[10.5px] text-faint">
      <div className="flex items-center gap-3.5">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: saveColor }} />
          {planFile}
        </span>
        <span className="text-fainter">{dirty ? "● modified buffer" : "in sync with disk"}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1">
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 4.5V8l2.5 1.5" />
          </svg>
          saved {lastSaved}
        </span>
        <span className="flex items-center gap-1" style={{ color: errColor }}>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="8" cy="8" r="6.5" />
            <line x1="8" y1="4.5" x2="8" y2="9" />
            <circle cx="8" cy="11.3" r="0.4" fill="currentColor" />
          </svg>
          {errors} render errors
        </span>
        <span>{wordCount} words</span>
        <span className="flex items-center gap-1">
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="4" cy="4" r="2" />
            <circle cx="4" cy="12" r="2" />
            <circle cx="12" cy="8" r="2" />
            <path d="M4 6v0a4 4 0 0 0 4 4h2M4 6v4" />
          </svg>
          main
        </span>
      </div>
    </div>
  );
}
