"use client";
import { CHAT_MODELS } from "@/hooks/useChat";
import type { ContextChip, UiChatMessage } from "@/types";

interface ChatPaneProps {
  messages: UiChatMessage[];
  sending: boolean;
  chatInput: string;
  onChatInputChange: (v: string) => void;
  onSend: () => void;
  contexts: ContextChip[];
  onRemoveContext: (id: string) => void;
  model: string;
  onSelectModel: (id: string) => void;
  modelOpen: boolean;
  onToggleModelMenu: () => void;
  planFile: string;
  sectionsCount: number;
}

export function ChatPane({
  messages,
  sending,
  chatInput,
  onChatInputChange,
  onSend,
  contexts,
  onRemoveContext,
  model,
  onSelectModel,
  modelOpen,
  onToggleModelMenu,
  planFile,
  sectionsCount,
}: ChatPaneProps) {
  const hasContexts = contexts.length > 0;
  return (
    <div className="flex h-full flex-col">
      <div className="flex-none border-b border-border">
        <div className="flex items-center justify-between px-3.5 pb-2.5 pt-[11px]">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--dim)" strokeWidth="1.4">
              <path d="M2 3.5h12v8H6l-3 2.5V11.5H2z" />
            </svg>
            <span className="font-mono text-[12px] text-text">side chat</span>
            <span className="rounded border border-border px-1.5 py-px font-mono text-[10px] text-fainter">separate thread</span>
          </div>
          <div className="relative">
            <button
              onClick={onToggleModelMenu}
              className="flex items-center gap-1.5 rounded-md border border-border bg-panel2 px-2.5 py-1 font-mono text-[10.5px] text-dim hover:bg-hover hover:text-text"
            >
              <span className="h-[5px] w-[5px] rounded-full bg-green" />
              {model}
              <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M3 6l5 5 5-5" />
              </svg>
            </button>
            {modelOpen && (
              <div className="absolute right-0 top-8 z-20 w-[178px] rounded-lg border border-border2 bg-elev p-1 shadow-[0_10px_30px_rgba(0,0,0,.4)]">
                {CHAT_MODELS.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => onSelectModel(m.id)}
                    className="flex items-center justify-between rounded-md px-2.5 py-[7px] hover:bg-hover"
                    style={{ background: m.id === model ? "var(--active)" : "transparent" }}
                  >
                    <div>
                      <div className="font-mono text-[11.5px] text-text">{m.name}</div>
                      <div className="mt-px font-mono text-[9.5px] text-fainter">{m.tag}</div>
                    </div>
                    <span className="text-[11px] text-green" style={{ visibility: m.id === model ? "visible" : "hidden" }}>
                      ✓
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="px-3.5 pb-[11px]">
          <div className="flex items-center gap-[7px] rounded-md border border-border bg-panel2 px-2.5 py-1.5">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="var(--faint)" strokeWidth="1.4">
              <path d="M3 1.5h6L13 5v9.5H3z" />
              <path d="M9 1.5V5h4" />
            </svg>
            <span className="font-mono text-[10.5px] text-faint">context:</span>
            <span className="font-mono text-[10.5px] text-dim">{planFile}</span>
            <span className="flex-1" />
            <span className="font-mono text-[10px] text-fainter">{sectionsCount} sections</span>
          </div>
        </div>
      </div>

      <div id="chatScroll" className="scroll flex flex-1 flex-col gap-3.5 overflow-y-auto px-3.5 py-4">
        {messages.map((msg, i) => {
          const isUser = msg.role === "user";
          return (
            <div key={i} className="flex flex-col [animation:fadeUp_.2s_ease]" style={{ alignItems: isUser ? "flex-end" : "flex-start" }}>
              <span className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.06em] text-fainter">{isUser ? "you" : model}</span>
              {!!msg.ctx?.length && (
                <div className="mb-1.5 flex max-w-[90%] flex-wrap justify-end gap-1.5">
                  {msg.ctx.map((cc, j) => (
                    <span
                      key={j}
                      className="flex max-w-[170px] items-center gap-1.5 rounded-md border border-border bg-panel2 px-1.5 py-0.5 text-[10.5px] text-faint"
                    >
                      <span className="font-mono text-[8.5px] uppercase text-blue">{cc.kind}</span>
                      <span className="overflow-hidden whitespace-nowrap text-ellipsis">{cc.label}</span>
                    </span>
                  ))}
                </div>
              )}
              <div
                className="max-w-[90%] rounded-[10px] border px-3 py-2.5 text-[13px] leading-relaxed"
                style={{
                  background: isUser ? "var(--active)" : "var(--panel2)",
                  borderColor: isUser ? "var(--border2)" : "var(--border)",
                  color: isUser ? "var(--text)" : "var(--dim)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        {sending && (
          <div className="flex flex-col items-start">
            <span className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.06em] text-fainter">{model}</span>
            <div className="flex gap-1 rounded-[10px] border border-border bg-panel2 px-3.5 py-[11px]">
              <span className="h-[5px] w-[5px] rounded-full bg-faint [animation:dot_1.2s_infinite]" />
              <span className="h-[5px] w-[5px] rounded-full bg-faint [animation:dot_1.2s_infinite_.2s]" />
              <span className="h-[5px] w-[5px] rounded-full bg-faint [animation:dot_1.2s_infinite_.4s]" />
            </div>
          </div>
        )}
      </div>

      <div className="flex-none border-t border-border p-3">
        <div className="rounded-[10px] border border-border2 bg-panel2 px-[11px] py-[9px]">
          {hasContexts && (
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {contexts.map((cx) => (
                <div key={cx.id} className="flex max-w-[210px] items-center gap-1.5 rounded-md border border-border2 bg-elev py-[3px] pl-[7px] pr-1">
                  <span className="font-mono text-[9px] uppercase tracking-[0.04em] text-blue">{cx.kind}</span>
                  <span className="overflow-hidden whitespace-nowrap text-ellipsis text-[11.5px] text-dim">{cx.label}</span>
                  <button
                    onClick={() => onRemoveContext(cx.id)}
                    title="Remove context"
                    className="flex h-4 w-4 items-center justify-center rounded text-[13px] leading-none text-faint hover:bg-hover hover:text-text"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <textarea
            value={chatInput}
            onChange={(e) => onChatInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Ask about this plan…"
            rows={1}
            className="w-full resize-none bg-transparent font-sans text-[13px] leading-normal text-text outline-none"
          />
          <div className="mt-[7px] flex items-center justify-between">
            <span className="font-mono text-[9.5px] text-fainter">⏎ send · ⇧⏎ newline</span>
            <button
              onClick={onSend}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[11px] font-semibold"
              style={{ background: chatInput.trim() ? "var(--text)" : "var(--active)", color: chatInput.trim() ? "var(--bg)" : "var(--faint)" }}
            >
              send
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M2 8h11M9 4l4 4-4 4" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
