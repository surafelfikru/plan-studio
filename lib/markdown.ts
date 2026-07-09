// Pure plan-body parsers: markdown -> sections -> typed blocks.
// Ported 1:1 from the old dc-runtime component (_script.js splitSections/_parseBlocks/
// _typedBlock/_parseDiff/_meta/_slug) with no DOM or framework dependency, so they're
// unit-testable and shared between server (SSR) and client if ever needed.
import type {
  Block,
  CalloutBlock,
  CodeRefBlock,
  DiffBlock,
  DiffRow,
  FencedMeta,
  MermaidBlock,
  ProseBlock,
  ResourceBlock,
  Section,
} from "@/types";

const HEADING_RE = /^(#{2,6})[ \t]+(.+?)[ \t]*$/gm;
const FENCE_RE =
  /```(mermaid|plan-diff|code-ref|callout|resource)[ \t]*\r?\n([\s\S]*?)```/g;

function slugify(title: string, seen: Set<string>): string {
  const base =
    (title || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section";
  let s = base;
  let i = 2;
  while (seen.has(s)) s = `${base}-${i++}`;
  seen.add(s);
  return s;
}

export function splitSections(body: string): Section[] {
  const seen = new Set<string>();
  const heads: { idx: number; end: number; line: string; level: number; title: string }[] = [];
  let m: RegExpExecArray | null;
  HEADING_RE.lastIndex = 0;
  while ((m = HEADING_RE.exec(body))) {
    heads.push({ idx: m.index, end: HEADING_RE.lastIndex, line: m[0]!, level: m[1]!.length, title: m[2]!.trim() });
  }

  const sections: Section[] = [];
  const introEnd = heads.length ? heads[0]!.idx : body.length;
  sections.push(mkSection("__intro__", 0, "", "", body.slice(0, introEnd), 0));

  for (let i = 0; i < heads.length; i++) {
    const h = heads[i]!;
    let bs = h.end;
    if (body[bs] === "\n") bs += 1;
    const nextIdx = i + 1 < heads.length ? heads[i + 1]!.idx : body.length;
    sections.push(
      mkSection(slugify(h.title, seen), h.level, h.title, h.line, body.slice(bs, nextIdx), i + 1),
    );
  }
  return sections;
}

function mkSection(
  id: string,
  level: number,
  title: string,
  headingLine: string,
  body: string,
  si: number,
): Section {
  return { id, level, title, headingLine, body, si, rawBlocks: parseBlocks(body, si) };
}

function parseBlocks(text: string, si: number): Block[] {
  const blocks: Block[] = [];
  let last = 0;
  let bi = 0;
  const pushProse = (str: string) => {
    if (str.replace(/^\s+|\s+$/g, "")) {
      blocks.push({ id: `s${si}b${bi++}`, type: "prose", text: str } satisfies ProseBlock);
    } else {
      bi++;
    }
  };

  let m: RegExpExecArray | null;
  FENCE_RE.lastIndex = 0;
  while ((m = FENCE_RE.exec(text))) {
    pushProse(text.slice(last, m.index));
    blocks.push(typedBlock(`s${si}b${bi++}`, m[1]!, m[2]!));
    last = FENCE_RE.lastIndex;
  }
  pushProse(text.slice(last));
  return blocks;
}

function parseMeta(inner: string): FencedMeta {
  const lines = inner.split("\n");
  const meta: Record<string, string> = {};
  let i = 0;
  for (; i < lines.length; i++) {
    const mm = lines[i]!.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (!mm) break;
    meta[mm[1]!] = mm[2]!.trim();
  }
  return { meta, rest: lines.slice(i).join("\n") };
}

function typedBlock(id: string, lang: string, inner: string): Block {
  if (lang === "mermaid") {
    return { id, type: "mermaid", src: inner.replace(/\s+$/, "") } satisfies MermaidBlock;
  }
  if (lang === "callout") {
    const r = parseMeta(inner);
    return { id, type: "callout", ctype: r.meta.type || "note", text: r.rest.trim() } satisfies CalloutBlock;
  }
  if (lang === "resource") {
    const r = parseMeta(inner);
    return {
      id,
      type: "resource",
      url: r.meta.url || "#",
      title: r.meta.title || r.meta.url || "link",
    } satisfies ResourceBlock;
  }
  if (lang === "code-ref") {
    const r = parseMeta(inner);
    const rng = (r.meta.lines || "").split("-");
    return {
      id,
      type: "coderef",
      file: r.meta.file || "",
      note: r.meta.note || "",
      start: parseInt(rng[0] || "1", 10) || 1,
      end: parseInt(rng[1] || rng[0] || "1", 10) || 1,
    } satisfies CodeRefBlock;
  }
  if (lang === "plan-diff") {
    return { id, type: "diff", ...parseDiff(inner) } satisfies DiffBlock;
  }
  return { id, type: "prose", text: inner } satisfies ProseBlock;
}

function parseDiff(inner: string): Omit<DiffBlock, "id" | "type"> {
  const r = parseMeta(inner);
  let lines = r.rest.split("\n");
  while (lines.length && lines[lines.length - 1] === "") lines.pop();

  let hunk = "";
  if (lines[0] && lines[0].indexOf("@@") === 0) {
    hunk = lines[0];
    lines = lines.slice(1);
  }
  let newNo = 1;
  const hm = hunk.match(/\+(\d+)/);
  if (hm) newNo = parseInt(hm[1]!, 10);

  let adds = 0;
  let dels = 0;
  const rows: DiffRow[] = [];
  for (const ln of lines) {
    const c = ln.charAt(0);
    let sgn: DiffRow["sgn"] = " ";
    let code = ln;
    if (c === "+") {
      sgn = "+";
      code = ln.slice(1);
    } else if (c === "-") {
      sgn = "-";
      code = ln.slice(1);
    } else if (c === " ") {
      code = ln.slice(1);
    }
    if (sgn === "+") {
      adds++;
      rows.push({ ln: String(newNo++), sgn, code });
    } else if (sgn === "-") {
      dels++;
      rows.push({ ln: "", sgn, code });
    } else {
      rows.push({ ln: String(newNo++), sgn, code });
    }
  }

  return {
    file: r.meta.file || "(file)",
    adds: `+${adds}`,
    dels: `−${dels}`,
    hunk: hunk || `@@ ${r.meta.file || ""} @@`,
    rows,
  };
}

export function findBlock(sections: Section[], id: string): Block | null {
  for (const sec of sections) {
    for (const b of sec.rawBlocks) if (b.id === id) return b;
  }
  return null;
}
