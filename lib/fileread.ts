import { realpath, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

export interface FileSlice {
  path: string; // the requested relative/absolute path, echoed back
  start: number;
  end: number;
  lines: string[]; // the requested 1-indexed inclusive range
  totalLines: number;
  truncated: boolean;
}

export class FileReadError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const MAX_BYTES = 2_000_000; // refuse to read very large files into memory

/**
 * Read a slice of a file, jailed to `root`.
 *
 * Security: both `root` and the resolved target are passed through realpath so
 * that `..` segments and symlinks cannot escape the jail. The resolved target
 * must live under the resolved root.
 */
export async function readFileSlice(
  root: string,
  relPath: string,
  start = 1,
  end = Number.MAX_SAFE_INTEGER,
): Promise<FileSlice> {
  if (!root) throw new FileReadError("missing root", 400);

  let realRoot: string;
  try {
    realRoot = await realpath(resolve(root));
  } catch {
    throw new FileReadError("root does not exist", 400);
  }

  const target = resolve(realRoot, relPath);
  let realTarget: string;
  try {
    realTarget = await realpath(target);
  } catch {
    throw new FileReadError("file not found", 404);
  }

  // Jail check: realTarget must be realRoot itself or a descendant of it.
  const rootWithSep = realRoot.endsWith("/") ? realRoot : realRoot + "/";
  if (realTarget !== realRoot && !realTarget.startsWith(rootWithSep)) {
    throw new FileReadError("path escapes root", 403);
  }

  const st = await stat(realTarget);
  if (!st.isFile()) throw new FileReadError("not a file", 400);
  if (st.size > MAX_BYTES) throw new FileReadError("file too large", 413);

  const raw = await readFile(realTarget, "utf8");
  const allLines = raw.split("\n");
  const s = Math.max(1, Math.floor(start));
  const e = Math.min(allLines.length, Math.floor(end));
  const lines = e >= s ? allLines.slice(s - 1, e) : [];

  return {
    path: relPath,
    start: s,
    end: e,
    lines,
    totalLines: allLines.length,
    truncated: e < allLines.length || s > 1,
  };
}
