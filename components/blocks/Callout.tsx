"use client";
import { useMarkdown } from "@/hooks/useMarkdown";

const COLORS: Record<string, string> = {
  note: "var(--blue)",
  background: "var(--faint)",
  gotcha: "var(--amber)",
  resource: "var(--blue)",
};

export function Callout({ ctype, text }: { ctype: string; text: string }) {
  const html = useMarkdown(text);
  const color = COLORS[ctype] || "var(--blue)";
  return (
    <div
      className="my-1.5 mb-3 flex gap-2.5 rounded-lg border border-border bg-panel2 p-3.5"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" className="mt-0.5 flex-none">
        <circle cx="8" cy="8" r="6.5" />
        <line x1="8" y1="7" x2="8" y2="11" />
        <circle cx="8" cy="4.8" r="0.5" fill={color} />
      </svg>
      <div className="min-w-0 text-[13.5px] leading-relaxed text-dim">
        <span className="mb-0.5 block font-mono text-[10.5px] uppercase tracking-[0.06em]" style={{ color }}>
          {ctype}
        </span>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
