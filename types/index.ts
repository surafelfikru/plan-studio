// Client-facing types. Server-only shapes (PlanDoc, PlanMeta, Frontmatter) are
// re-exported as `import type` from lib/plans, which is safe: type-only imports
// are erased at compile time, so the Node-only module is never bundled client-side.
export type { PlanDoc, PlanMeta, Frontmatter } from "@/lib/plans";
export type { ChatMessage as ApiChatMessage } from "@/lib/chat";
export type { Thread, ThreadFile } from "@/lib/threads";
export type { FileSlice } from "@/lib/fileread";

export interface Section {
  id: string;
  level: number; // 0 for the untitled intro section
  title: string;
  headingLine: string; // '' for the intro section
  body: string;
  si: number; // section index, used to namespace block ids
  rawBlocks: Block[];
}

export interface ProseBlock {
  id: string;
  type: "prose";
  text: string;
}

export interface MermaidBlock {
  id: string;
  type: "mermaid";
  src: string;
}

export interface DiffRow {
  ln: string; // '' for pure deletions
  sgn: "+" | "-" | " ";
  code: string;
}

export interface DiffBlock {
  id: string;
  type: "diff";
  file: string;
  adds: string; // e.g. "+3"
  dels: string; // e.g. "−1"
  hunk: string;
  rows: DiffRow[];
}

export interface CodeRefBlock {
  id: string;
  type: "coderef";
  file: string;
  note: string;
  start: number;
  end: number;
}

export interface CalloutBlock {
  id: string;
  type: "callout";
  ctype: string; // note | background | gotcha | resource (free-form frontmatter value)
  text: string;
}

export interface ResourceBlock {
  id: string;
  type: "resource";
  url: string;
  title: string;
}

export type Block =
  | ProseBlock
  | MermaidBlock
  | DiffBlock
  | CodeRefBlock
  | CalloutBlock
  | ResourceBlock;

export interface FencedMeta {
  meta: Record<string, string>;
  rest: string;
}

// ---- selection / chat context / tweaks (client-only UI state) ----

export interface ContextChip {
  id: string;
  type: "text" | "section";
  kind: "text" | "section";
  label: string;
  text: string;
}

export interface Tweak {
  id: string;
  excerpt: string;
  instruction: string;
}

export interface SelectionState {
  x: number;
  y: number;
  text: string;
  mode: "actions" | "tweak";
  draft: string;
}

// ---- chat (UI-level; extends the wire ChatMessage with UI-only fields) ----

export interface UiChatMessage {
  role: "user" | "assistant";
  text: string;
  ctx?: { kind: string; label: string }[];
  streaming?: boolean;
}

export type Theme = "dark" | "light";

export interface MermaidViewState {
  view: "rendered" | "source";
  zoom: number;
  panX: number;
  panY: number;
  svg: string;
}
