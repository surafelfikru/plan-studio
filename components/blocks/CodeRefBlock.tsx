"use client";

export function CodeRefBlock({
  file,
  range,
  note,
  rows,
}: {
  file: string;
  range: string;
  note: string;
  rows: { ln: string; code: string }[];
}) {
  return (
    <div className="my-1.5 mb-4 overflow-hidden rounded-[10px] border border-border">
      <div className="flex items-center justify-between border-b border-border bg-panel2 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 font-mono text-[11.5px] text-dim">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="var(--faint)" strokeWidth="1.4" className="flex-none">
            <path d="M5 4 2 8l3 4M11 4l3 4-3 4" />
          </svg>
          <span className="overflow-hidden whitespace-nowrap text-ellipsis">{file}</span>
          <span className="flex-none text-fainter">{range}</span>
        </div>
      </div>
      {note && <div className="border-b border-border px-3 py-1.5 text-[12.5px] leading-snug text-faint">{note}</div>}
      <div className="overflow-auto bg-panel font-mono text-[12px] leading-[1.7]">
        {rows.map((r, i) => (
          <div key={i} className="flex">
            <span className="w-11 flex-none select-none border-r border-border px-2.5 py-0 text-right text-fainter">{r.ln}</span>
            <span className="flex-1 whitespace-pre px-3.5 text-dim">{r.code}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
