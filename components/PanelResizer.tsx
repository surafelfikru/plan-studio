"use client";

export function PanelResizer({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return <div onMouseDown={onMouseDown} className="relative z-[5] -mx-[3px] w-[5px] flex-none cursor-col-resize hover:bg-border2" />;
}
