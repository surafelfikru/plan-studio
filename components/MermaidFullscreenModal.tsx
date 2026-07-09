"use client";

interface MermaidFullscreenModalProps {
  id: string;
  svg: string;
  zoom: number;
  panX: number;
  panY: number;
  onPanStart: (e: React.MouseEvent) => void;
  onReset: () => void;
  onClose: () => void;
}

export function MermaidFullscreenModal({ id, svg, zoom, panX, panY, onPanStart, onReset, onClose }: MermaidFullscreenModalProps) {
  return (
    <div data-sel-keep className="fixed inset-0 z-[80] flex flex-col bg-black/[.82]">
      <div className="flex items-center justify-between border-b border-border bg-panel px-4 py-2.5">
        <div className="flex items-center gap-2 font-mono text-[11px] text-faint">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <rect x="1.5" y="2" width="5" height="4" rx="1" />
            <rect x="9.5" y="2" width="5" height="4" rx="1" />
            <rect x="5.5" y="10" width="5" height="4" rx="1" />
            <path d="M4 6v2h8V6M8 8v2" />
          </svg>
          mermaid · fullscreen<span className="min-w-[42px] text-right text-fainter">{Math.round(zoom * 100)}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={onReset} className="h-[26px] rounded-md border border-border px-2.5 font-mono text-[10.5px] text-faint hover:bg-hover hover:text-text">
            reset
          </button>
          <button onClick={onClose} className="flex h-[26px] items-center gap-1.5 rounded-md border border-border px-2.5 font-mono text-[10.5px] text-faint hover:bg-hover hover:text-text">
            close ✕
          </button>
        </div>
      </div>
      <div className="mm-viewport relative flex-1 cursor-grab overflow-hidden" data-mm-id={id} onMouseDown={onPanStart}>
        <div
          className="mmd absolute left-0 top-0 [will-change:transform]"
          style={{ transformOrigin: "0 0", transform: `translate(${panX}px,${panY}px) scale(${zoom})` }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 select-none font-mono text-[10px] text-fainter">
          scroll to zoom · drag to pan · esc to close
        </div>
      </div>
    </div>
  );
}
