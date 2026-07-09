"use client";
import type { MermaidState } from "@/hooks/useMermaid";

interface MermaidBlockProps {
  id: string;
  src: string;
  state: MermaidState;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onToggleSource: () => void;
  onOpenFull: () => void;
  onPanStart: (e: React.MouseEvent) => void;
  onCopy: () => void;
}

export function MermaidBlock({
  id,
  src,
  state,
  onZoomIn,
  onZoomOut,
  onFit,
  onToggleSource,
  onOpenFull,
  onPanStart,
  onCopy,
}: MermaidBlockProps) {
  const transform = `translate(${state.panX}px,${state.panY}px) scale(${state.zoom})`;
  return (
    <div className="my-1.5 mb-4 overflow-hidden rounded-[10px] border border-border bg-panel">
      <div className="flex items-center justify-between border-b border-border bg-panel2 px-2.5 py-[7px]">
        <div className="flex items-center gap-2 font-mono text-[10.5px] text-faint">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <rect x="1.5" y="2" width="5" height="4" rx="1" />
            <rect x="9.5" y="2" width="5" height="4" rx="1" />
            <rect x="5.5" y="10" width="5" height="4" rx="1" />
            <path d="M4 6v2h8V6M8 8v2" />
          </svg>
          mermaid
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={onZoomOut} title="Zoom out" className="h-6 w-6 rounded text-faint hover:bg-hover hover:text-text">
            −
          </button>
          <span className="min-w-[34px] text-center font-mono text-[10px] text-faint">{Math.round(state.zoom * 100)}%</span>
          <button onClick={onZoomIn} title="Zoom in" className="h-6 w-6 rounded text-faint hover:bg-hover hover:text-text">
            +
          </button>
          <button onClick={onFit} title="Fit" className="flex h-6 w-6 items-center justify-center rounded text-faint hover:bg-hover hover:text-text">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M2 5V2h3M14 5V2h-3M2 11v3h3M14 11v3h-3" />
            </svg>
          </button>
          <div className="mx-[3px] h-4 w-px bg-border" />
          <button
            onClick={onToggleSource}
            className="flex h-6 items-center rounded px-2 font-mono text-[10px] hover:bg-hover"
            style={{ background: state.view === "source" ? "var(--active)" : "transparent", color: state.view === "source" ? "var(--text)" : "var(--faint)" }}
          >
            {state.view === "source" ? "rendered" : "source"}
          </button>
          <button onClick={onOpenFull} title="Fullscreen" className="flex h-6 w-6 items-center justify-center rounded text-faint hover:bg-hover hover:text-text">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" />
            </svg>
          </button>
          <button onClick={onCopy} title="Copy source" className="flex h-6 w-6 items-center justify-center rounded text-faint hover:bg-hover hover:text-text">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
              <rect x="5" y="5" width="9" height="9" rx="1.5" />
              <path d="M11 5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2" />
            </svg>
          </button>
        </div>
      </div>
      {state.view === "rendered" ? (
        <div className="mm-viewport relative h-[340px] cursor-grab overflow-hidden bg-panel" data-mm-id={id} onMouseDown={onPanStart}>
          <div
            className="mmd absolute left-0 top-0 [will-change:transform]"
            style={{ transformOrigin: "0 0", transform }}
            dangerouslySetInnerHTML={{
              __html:
                state.svg ||
                '<div style="color:var(--fainter);font-family:Geist Mono,monospace;font-size:11px;padding:24px 0">rendering diagram…</div>',
            }}
          />
          <div className="pointer-events-none absolute bottom-1.5 right-2 select-none font-mono text-[9px] text-fainter">
            scroll zoom · drag pan
          </div>
        </div>
      ) : (
        <pre className="m-0 overflow-auto whitespace-pre p-4 font-mono text-[12px] leading-[1.7] text-dim">{src}</pre>
      )}
    </div>
  );
}
