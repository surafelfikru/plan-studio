"use client";
import type { PlanGroup } from "@/hooks/usePlans";

interface SidebarProps {
  groups: PlanGroup[];
  activeSlug: string | null;
  planQuery: string;
  onQueryChange: (v: string) => void;
  onSelect: (slug: string) => void;
  planCount: number;
}

export function Sidebar({ groups, activeSlug, planQuery, onQueryChange, onSelect, planCount }: SidebarProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-none px-3 pb-2.5 pt-3">
        <div className="flex items-center gap-2 rounded-[7px] border border-border bg-panel2 px-2.5 py-[7px]">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="var(--faint)" strokeWidth="1.5">
            <circle cx="7" cy="7" r="4.5" />
            <line x1="10.5" y1="10.5" x2="14" y2="14" />
          </svg>
          <input
            className="q flex-1 bg-transparent font-mono text-[12px] text-text outline-none"
            value={planQuery}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search plans"
          />
          <span className="rounded border border-border px-1.5 py-px font-mono text-[10px] text-fainter">⌘K</span>
        </div>
      </div>
      <div className="scroll flex-1 overflow-y-auto px-2 pb-4 pt-1">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="my-2.5 mb-0.5 flex items-center justify-between px-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-fainter">{group.label}</span>
              <span className="font-mono text-[10px] text-fainter">{group.count}</span>
            </div>
            {group.items.map((p) => {
              const active = p.slug === activeSlug;
              return (
                <div
                  key={p.slug}
                  onClick={() => onSelect(p.slug)}
                  className="mb-px flex cursor-pointer items-center gap-2.5 rounded-[7px] border px-2 py-[7px] hover:bg-hover"
                  style={{ background: active ? "var(--active)" : "transparent", borderColor: active ? "var(--border)" : "transparent" }}
                >
                  <span className="h-[5px] w-[5px] flex-none rounded-full" style={{ background: active ? "var(--green)" : "var(--fainter)" }} />
                  <div className="min-w-0 flex-1">
                    <div
                      className="overflow-hidden whitespace-nowrap text-ellipsis text-[13px]"
                      style={{ color: active ? "var(--text)" : "var(--dim)", fontWeight: active ? 600 : 400 }}
                    >
                      {p.title}
                    </div>
                    <div className="mt-0.5 overflow-hidden whitespace-nowrap text-ellipsis font-mono text-[10.5px] text-fainter">{p.meta}</div>
                  </div>
                  {/* fix #1: capped width + ellipsis so a long `status` can never overflow into the row above it */}
                  <span
                    className="flex-none overflow-hidden whitespace-nowrap text-ellipsis rounded border border-border px-1.5 font-mono text-[10px] text-faint"
                    style={{ maxWidth: 96 }}
                  >
                    {p.ver}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex flex-none items-center gap-2 border-t border-border px-3.5 py-[9px]">
        <span className="h-1.5 w-1.5 rounded-full bg-green [box-shadow:0_0_6px_var(--green)]" />
        <span className="font-mono text-[10.5px] text-faint">file watcher · live</span>
        <span className="flex-1" />
        <span className="font-mono text-[10.5px] text-fainter">{planCount} plans</span>
      </div>
    </div>
  );
}
