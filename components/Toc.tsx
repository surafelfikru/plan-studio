"use client";

export interface TocItem {
  id: string;
  label: string;
  active: boolean;
}

export function Toc({ items, visible, onClick }: { items: TocItem[]; visible: boolean; onClick: (id: string) => void }) {
  if (!visible) return null;
  return (
    <div className="w-[174px] flex-none">
      <div className="sticky top-0 pt-1">
        <div className="mb-2.5 pl-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-fainter">On this page</div>
        {items.map((t) => (
          <div
            key={t.id}
            onClick={() => onClick(t.id)}
            className="block cursor-pointer py-1.5 pl-2.5 text-[12.5px] leading-snug hover:text-text"
            style={{ borderLeft: `2px solid ${t.active ? "var(--text)" : "var(--border)"}`, color: t.active ? "var(--text)" : "var(--faint)" }}
          >
            {t.label}
          </div>
        ))}
      </div>
    </div>
  );
}
