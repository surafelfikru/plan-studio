"use client";
import { useCallback, useRef, useState } from "react";
import { truncate } from "@/lib/text";
import type { ApiChatMessage, ContextChip, UiChatMessage } from "@/types";

const INITIAL_MESSAGE: UiChatMessage = {
  role: "assistant",
  text: "Side thread on a cheaper model — separate from your main Claude Code session. Ask me about the plan; I can explain it or draft edits without spending your main context.",
};

export const CHAT_MODELS = [
  { id: "Claude Haiku", name: "Claude Haiku", tag: "fast · cheap" },
  { id: "Claude Sonnet", name: "Claude Sonnet", tag: "balanced" },
  { id: "Local · llama", name: "Local · llama", tag: "on-device" },
];

interface UseChatOptions {
  onFlash: (msg: string) => void;
  onOpenChat: () => void;
}

function scrollChatToBottom() {
  const el = document.getElementById("chatScroll");
  if (el) el.scrollTop = el.scrollHeight;
}

export function useChat(slug: string | null, { onFlash, onOpenChat }: UseChatOptions) {
  const [messages, setMessages] = useState<UiChatMessage[]>([INITIAL_MESSAGE]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const [contexts, setContexts] = useState<ContextChip[]>([]);
  const [model, setModel] = useState("Claude Haiku");
  const [modelOpen, setModelOpen] = useState(false);
  const idCounter = useRef(0);

  const addContext = useCallback(
    (type: ContextChip["type"], text: string) => {
      setContexts((cur) => {
        if (cur.some((c) => c.text === text && c.type === type)) {
          onFlash("context already added");
          return cur;
        }
        onOpenChat();
        onFlash("added to chat context");
        const chip: ContextChip = {
          id: `cx${++idCounter.current}`,
          type,
          kind: type === "section" ? "section" : "text",
          label: truncate(text, 42),
          text,
        };
        return [...cur, chip];
      });
    },
    [onFlash, onOpenChat],
  );
  const removeContext = useCallback((id: string) => setContexts((cur) => cur.filter((c) => c.id !== id)), []);

  const appendToInput = useCallback(
    (text: string) => {
      setChatInput((cur) => (cur ? `${cur}\n${text}` : text));
      onOpenChat();
    },
    [onOpenChat],
  );

  const send = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || sending || !slug) return;
    const ctx = contexts.map((c) => ({ kind: c.kind, label: c.label }));
    const section = contexts.map((c) => c.text).filter(Boolean).join("\n\n") || undefined;
    const nextMessages = [...messages, { role: "user" as const, text, ctx }];
    setMessages(nextMessages);
    setChatInput("");
    setSending(true);
    setContexts([]);
    scrollChatToBottom();

    const apiMessages: ApiChatMessage[] = nextMessages.map((m) => ({ role: m.role, content: m.text }));
    try {
      const res = await fetch(`/api/chat/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, section }),
      });
      if (!res.ok || !res.body) {
        setSending(false);
        onFlash("chat failed");
        return;
      }
      setSending(false);
      setMessages((cur) => [...cur, { role: "assistant", text: "", streaming: true }]);
      scrollChatToBottom();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";

      const updateStreaming = (t: string) => {
        setMessages((cur) => {
          const next = [...cur];
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i]!.streaming) {
              next[i] = { ...next[i]!, text: t };
              break;
            }
          }
          return next;
        });
        scrollChatToBottom();
      };
      const finishStreaming = () => {
        setMessages((cur) => {
          const next = [...cur];
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i]!.streaming) {
              next[i] = { ...next[i]!, streaming: false };
              break;
            }
          }
          return next;
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n\n")) >= 0) {
          const chunk = buf.slice(0, nl);
          buf = buf.slice(nl + 2);
          let event = "message";
          let data = "";
          for (const line of chunk.split("\n")) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) data = line.slice(5).trim();
          }
          if (!data) continue;
          let payload: any = {};
          try {
            payload = JSON.parse(data);
          } catch {}
          if (event === "delta" && payload.text) {
            acc += payload.text;
            updateStreaming(acc);
          } else if (event === "done") {
            if (payload.text) acc = payload.text;
            updateStreaming(acc);
          } else if (event === "error") {
            acc += `\n\n_(error: ${payload.message || "failed"})_`;
            updateStreaming(acc);
          }
        }
      }
      finishStreaming();
    } catch {
      setSending(false);
      onFlash("chat failed");
    }
  }, [chatInput, sending, slug, contexts, messages, onFlash]);

  return {
    messages,
    chatInput,
    setChatInput,
    sending,
    send,
    contexts,
    addContext,
    removeContext,
    appendToInput,
    model,
    setModel,
    modelOpen,
    setModelOpen,
  };
}
