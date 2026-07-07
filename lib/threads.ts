import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { THREADS_DIR } from "./config.ts";
import { safeSlug } from "./plans.ts";
import type { ChatMessage } from "./chat.ts";

export interface Thread {
  id: string;
  title?: string;
  messages: ChatMessage[];
}

export interface ThreadFile {
  slug: string;
  threads: Thread[];
}

function fileFor(slug: string): string | null {
  const safe = safeSlug(slug);
  if (!safe) return null;
  return join(THREADS_DIR, `${safe}.json`);
}

export async function readThreads(slug: string): Promise<ThreadFile> {
  const path = fileFor(slug);
  if (!path) return { slug, threads: [] };
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as ThreadFile;
  } catch {
    return { slug, threads: [] };
  }
}

export async function writeThreads(
  slug: string,
  data: ThreadFile,
): Promise<boolean> {
  const path = fileFor(slug);
  if (!path) return false;
  await mkdir(THREADS_DIR, { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2), "utf8");
  return true;
}
