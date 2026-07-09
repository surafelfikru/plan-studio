"use client";
import type { Theme } from "@/types";

interface TopBarProps {
  planFile: string;
  theme: Theme;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  toggleChat: () => void;
}

export function TopBar({ planFile, theme, toggleTheme, toggleSidebar, toggleChat }: TopBarProps) {
  return (
    <div className="flex h-[46px] flex-none items-center justify-between border-b border-border bg-panel px-3.5">
      <div className="flex items-center gap-3.5">
        <div className="flex items-center gap-2">
          <div
            className="h-[18px] w-[18px] bg-text"
            style={{
              clipPath:
                "polygon(0 0,42% 0,42% 42%,58% 42%,58% 0,100% 0,100% 100%,58% 100%,58% 58%,42% 58%,42% 100%,0 100%)",
            }}
          />
          <span className="font-mono text-[13px] font-semibold tracking-[0.04em] text-text">PLAN&nbsp;STUDIO</span>
        </div>
        <div className="h-[18px] w-px bg-border" />
        <div className="flex items-center gap-1.5 font-mono text-[11.5px] text-faint">
          <span>~/.claude/plans</span>
          <span className="text-fainter">/</span>
          <span className="text-dim">{planFile}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={toggleSidebar} title="Toggle plans" className="flex h-[30px] w-[30px] items-center justify-center rounded-md text-faint hover:bg-hover hover:text-text">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <rect x="1.5" y="2" width="13" height="12" rx="1.5" />
            <line x1="6" y1="2" x2="6" y2="14" />
          </svg>
        </button>
        <button onClick={toggleChat} title="Toggle chat" className="flex h-[30px] w-[30px] items-center justify-center rounded-md text-faint hover:bg-hover hover:text-text">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <rect x="1.5" y="2" width="13" height="12" rx="1.5" />
            <line x1="10.5" y1="2" x2="10.5" y2="14" />
          </svg>
        </button>
        <div className="mx-1 h-[18px] w-px bg-border" />
        <button onClick={toggleTheme} title="Toggle theme" className="flex h-[30px] w-[30px] items-center justify-center rounded-md text-faint hover:bg-hover hover:text-text">
          {theme === "dark" ? (
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M13.5 9A5.5 5.5 0 0 1 7 2.5 5.5 5.5 0 1 0 13.5 9Z" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
              <circle cx="8" cy="8" r="3.2" />
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6 13 13M13 3l-1.4 1.4M4.4 11.6 3 13" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
