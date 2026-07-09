"use client";

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-[42px] left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-lg border border-border2 bg-elev px-3.5 py-2.5 font-mono text-[11.5px] text-text shadow-[0_12px_36px_rgba(0,0,0,.45)] [animation:fadeUp_.2s_ease]">
      <span className="h-1.5 w-1.5 rounded-full bg-green" />
      {message}
    </div>
  );
}
