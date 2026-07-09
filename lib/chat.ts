import { spawn } from "node:child_process";
import { once } from "node:events";
import { CHAT_MODEL, APP_DIR } from "./config";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatContext {
  planTitle: string;
  planBody: string; // the markdown the chat can reason about
  section?: string; // optional focused section text
}

// Tools the read-only Q&A chat must never use (avoids edits / shell / network).
const DISALLOWED = "Bash,Edit,Write,NotebookEdit,WebFetch,WebSearch,Agent";

function buildSystemPrompt(ctx: ChatContext): string {
  const parts = [
    "You are a helpful assistant embedded in a planning tool called Plan Studio.",
    "The user is reading an implementation plan and asking questions about it.",
    "Answer concisely and in markdown. You are read-only: explain, clarify, and",
    "when asked to change the plan, propose the change as a fenced ```plan-diff```",
    "or ```mermaid``` block rather than editing any file yourself.",
    "",
    `# Plan: ${ctx.planTitle}`,
    "",
    ctx.planBody,
  ];
  if (ctx.section) {
    parts.push("", "# The user is focused on this section:", "", ctx.section);
  }
  return parts.join("\n");
}

function buildPrompt(messages: ChatMessage[]): string {
  if (messages.length === 1) return messages[0]!.content;
  const history = messages
    .slice(0, -1)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");
  const latest = messages[messages.length - 1]!.content;
  return `Conversation so far:\n\n${history}\n\nNow answer this latest user message:\n\n${latest}`;
}

/**
 * Run one chat turn via headless `claude -p`. Streams text deltas to `onDelta`.
 * Resolves with the full assistant text when the process exits.
 */
export async function runChatTurn(
  messages: ChatMessage[],
  ctx: ChatContext,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const proc = spawn(
    "claude",
    [
      "-p",
      buildPrompt(messages),
      "--model",
      CHAT_MODEL,
      "--output-format",
      "stream-json",
      "--include-partial-messages",
      "--verbose",
      "--append-system-prompt",
      buildSystemPrompt(ctx),
      "--disallowed-tools",
      DISALLOWED,
    ],
    {
      cwd: APP_DIR, // neutral cwd: no project CLAUDE.md leaks into the chat
      stdio: ["ignore", "pipe", "pipe"],
      signal,
    },
  );
  proc.stderr.on("data", () => {}); // drain so a chatty child can't block on a full pipe

  let full = "";
  let sawDelta = false;
  let resultText = "";
  let buf = "";

  const decoder = new TextDecoder();
  for await (const chunk of proc.stdout) {
    buf += decoder.decode(chunk, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let obj: any;
      try {
        obj = JSON.parse(line);
      } catch {
        continue;
      }
      // Partial streaming deltas
      const delta = obj?.event?.delta;
      if (delta?.type === "text_delta" && typeof delta.text === "string") {
        sawDelta = true;
        full += delta.text;
        onDelta(delta.text);
        continue;
      }
      // Final result line carries the complete text as a fallback
      if (obj?.type === "result" && typeof obj.result === "string") {
        resultText = obj.result;
      }
    }
  }

  await once(proc, "exit");

  if (!sawDelta && resultText) {
    full = resultText;
    onDelta(resultText);
  }
  return full;
}
