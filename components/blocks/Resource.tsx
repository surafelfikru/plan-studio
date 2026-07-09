"use client";

export function Resource({ url, title, host }: { url: string; title: string; host: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener"
      className="my-1.5 mb-3 flex items-center gap-3.5 rounded-[10px] border border-border bg-panel px-4 py-3.5 no-underline hover:border-border2 hover:bg-panel2"
    >
      <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-lg border border-border bg-elev">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="var(--dim)" strokeWidth="1.4">
          <circle cx="8" cy="8" r="6.5" />
          <path d="M1.5 8h13M8 1.5c2 2 2 11 0 13M8 1.5c-2 2-2 11 0 13" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-medium leading-snug text-text">{title}</div>
        <div className="mt-1.5 font-mono text-[10.5px] text-fainter">{host}</div>
      </div>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--faint)" strokeWidth="1.4" className="flex-none">
        <path d="M6 3H3v10h10v-3M9 3h4v4M13 3 7 9" />
      </svg>
    </a>
  );
}
