"use client";

interface HeadingBlockProps {
  id: string;
  label: string;
  folded: boolean;
  onFold: () => void;
  onCopyLink: () => void;
  onAsk: () => void;
  canEdit: boolean;
  onEdit: () => void;
}

export function HeadingBlock({ id, label, folded, onFold, onCopyLink, onAsk, canEdit, onEdit }: HeadingBlockProps) {
  return (
    <div className="relative my-5 mb-1.5 flex items-center gap-2">
      <span onClick={onFold} className="w-3.5 cursor-pointer text-center text-[11px] text-faint">
        {folded ? "▸" : "▾"}
      </span>
      <h2
        id={id}
        onClick={onFold}
        className="m-0 cursor-pointer text-[19px] font-semibold tracking-[-0.01em] text-text [overflow-wrap:anywhere]"
      >
        {label}
      </h2>
      <button onClick={onCopyLink} title="Copy link" className="p-0.5 text-fainter hover:text-dim">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M6.5 9.5 9.5 6.5M5 8 3.5 9.5a2.1 2.1 0 0 0 3 3L8 11M11 8l1.5-1.5a2.1 2.1 0 0 0-3-3L8 5" />
        </svg>
      </button>
      <span className="flex-1" />
      <button
        onClick={onAsk}
        title="Ask side chat about this"
        className="flex items-center gap-1.5 rounded-md border border-border px-2 py-0.5 font-mono text-[10.5px] text-faint hover:bg-hover hover:text-text"
      >
        ask
      </button>
      {canEdit && (
        <button
          onClick={onEdit}
          title="Edit section"
          className="flex items-center gap-1.5 rounded-md border border-border px-2 py-0.5 font-mono text-[10.5px] text-faint hover:bg-hover hover:text-text"
        >
          edit
        </button>
      )}
    </div>
  );
}
