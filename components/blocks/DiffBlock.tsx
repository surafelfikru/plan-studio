"use client";
import clsx from "clsx";
import type { DiffRow } from "@/types";

interface DiffBlockProps {
  file: string;
  adds: string;
  dels: string;
  hunk: string;
  rows: DiffRow[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  view: "unified" | "split";
  onSetView: (v: "unified" | "split") => void;
}

function rowColors(sgn: DiffRow["sgn"]) {
  if (sgn === "+") return { bg: "var(--addbg)", gut: "var(--addgut)", sgn: "var(--addtx)", txt: "var(--addtx)" };
  if (sgn === "-") return { bg: "var(--delbg)", gut: "var(--delgut)", sgn: "var(--deltx)", txt: "var(--deltx)" };
  return { bg: "transparent", gut: "transparent", sgn: "var(--fainter)", txt: "var(--dim)" };
}

export function DiffBlock({ file, adds, dels, hunk, rows, collapsed, onToggleCollapse, view, onSetView }: DiffBlockProps) {
  return (
    <div className="my-1.5 mb-4 overflow-hidden rounded-[10px] border border-border">
      <div className="flex items-center justify-between border-b border-border bg-panel2 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span onClick={onToggleCollapse} className="w-2.5 cursor-pointer text-[10px] text-faint">
            {collapsed ? "▸" : "▾"}
          </span>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="var(--faint)" strokeWidth="1.4">
            <path d="M3 1.5h6L13 5v9.5H3z" />
            <path d="M9 1.5V5h4" />
          </svg>
          <span className="overflow-hidden whitespace-nowrap text-ellipsis font-mono text-[12px] text-text">{file}</span>
          <span className="font-mono text-[11px] text-addtx">{adds}</span>
          <span className="font-mono text-[11px] text-deltx">{dels}</span>
        </div>
        <div className="flex rounded-md border border-border bg-bg p-0.5">
          <button
            onClick={() => onSetView("unified")}
            className={clsx("rounded px-2.5 py-1 font-mono text-[10px]", view === "unified" ? "bg-active text-text" : "text-faint")}
          >
            unified
          </button>
          <button
            onClick={() => onSetView("split")}
            className={clsx("rounded px-2.5 py-1 font-mono text-[10px]", view === "split" ? "bg-active text-text" : "text-faint")}
          >
            split
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="overflow-auto bg-panel font-mono text-[12px] leading-[1.65]">
          <div className="whitespace-pre border-b border-border bg-panel2 px-3 py-[3px] text-faint">{hunk}</div>
          {rows.map((r, i) => {
            const c = rowColors(r.sgn);
            return (
              <div key={i} className="flex" style={{ background: c.bg }}>
                <span className="w-[42px] flex-none select-none px-2 py-px text-right text-fainter" style={{ background: c.gut }}>
                  {r.ln}
                </span>
                <span className="w-3.5 flex-none select-none text-center" style={{ color: c.sgn }}>
                  {r.sgn}
                </span>
                <span className="flex-1 whitespace-pre pr-3.5" style={{ color: c.txt }}>
                  {r.code}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
