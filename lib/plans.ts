import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { PLANS_DIR } from "./config";

export interface Frontmatter {
  title?: string;
  root?: string;
  status?: string;
  [key: string]: string | undefined;
}

export interface PlanMeta {
  slug: string;
  title: string;
  root?: string;
  status?: string;
  mtimeMs: number;
  size: number;
}

export interface PlanDoc extends PlanMeta {
  content: string; // full raw markdown, including frontmatter
  body: string; // markdown after the frontmatter block
  frontmatter: Frontmatter;
  version: string; // content hash for optimistic-concurrency
}

/** Minimal YAML-ish frontmatter parser: a leading `---\n...\n---` block of `key: value` lines. */
export function parseFrontmatter(raw: string): {
  frontmatter: Frontmatter;
  body: string;
} {
  if (!raw.startsWith("---")) return { frontmatter: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { frontmatter: {}, body: raw };
  const block = raw.slice(3, end).trim();
  // body starts after the closing `---` line
  const afterClose = raw.indexOf("\n", end + 1);
  const body = afterClose === -1 ? "" : raw.slice(afterClose + 1);
  const frontmatter: Frontmatter = {};
  for (const line of block.split("\n")) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    let value = m[2]!.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    frontmatter[m[1]!] = value;
  }
  return { frontmatter, body };
}

function deriveTitle(frontmatter: Frontmatter, body: string): string {
  if (frontmatter.title) return frontmatter.title;
  const heading = body.match(/^#\s+(.+)$/m);
  return heading ? heading[1]!.trim().replace(/`/g, "") : "(untitled plan)";
}

export function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function isPlanFile(name: string): boolean {
  return name.endsWith(".md") && !name.startsWith(".");
}

function slugFromName(name: string): string {
  return name.replace(/\.md$/, "");
}

export async function listPlans(): Promise<PlanMeta[]> {
  let names: string[];
  try {
    names = await readdir(PLANS_DIR);
  } catch {
    return [];
  }
  const out: PlanMeta[] = [];
  for (const name of names) {
    if (!isPlanFile(name)) continue;
    const full = join(PLANS_DIR, name);
    try {
      const [raw, st] = await Promise.all([
        readFile(full, "utf8"),
        stat(full),
      ]);
      const { frontmatter, body } = parseFrontmatter(raw);
      out.push({
        slug: slugFromName(name),
        title: deriveTitle(frontmatter, body),
        root: frontmatter.root,
        status: frontmatter.status,
        mtimeMs: st.mtimeMs,
        size: st.size,
      });
    } catch {
      // skip unreadable files
    }
  }
  out.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return out;
}

/** Reject slugs that could traverse out of the plans directory. */
export function safeSlug(slug: string): string | null {
  if (!slug || slug.includes("/") || slug.includes("\\") || slug.includes("..")) {
    return null;
  }
  return slug;
}

export async function readPlan(slug: string): Promise<PlanDoc | null> {
  const safe = safeSlug(slug);
  if (!safe) return null;
  const full = join(PLANS_DIR, `${safe}.md`);
  let raw: string;
  let st: Awaited<ReturnType<typeof stat>>;
  try {
    [raw, st] = await Promise.all([readFile(full, "utf8"), stat(full)]);
  } catch {
    return null;
  }
  const { frontmatter, body } = parseFrontmatter(raw);
  return {
    slug: safe,
    title: deriveTitle(frontmatter, body),
    root: frontmatter.root,
    status: frontmatter.status,
    mtimeMs: st.mtimeMs,
    size: st.size,
    content: raw,
    body,
    frontmatter,
    version: hashContent(raw),
  };
}

export interface WriteResult {
  ok: boolean;
  conflict?: boolean;
  doc?: PlanDoc;
}

/**
 * Write the full markdown back. If `baseVersion` is provided and no longer
 * matches the on-disk content hash, the write is rejected as a conflict.
 */
export async function writePlan(
  slug: string,
  content: string,
  baseVersion?: string,
): Promise<WriteResult> {
  const safe = safeSlug(slug);
  if (!safe) return { ok: false };
  const full = join(PLANS_DIR, `${safe}.md`);

  if (baseVersion) {
    const current = await readPlan(safe);
    if (current && current.version !== baseVersion) {
      return { ok: false, conflict: true, doc: current };
    }
  }

  await writeFile(full, content, "utf8");
  const doc = await readPlan(safe);
  return { ok: true, doc: doc ?? undefined };
}
