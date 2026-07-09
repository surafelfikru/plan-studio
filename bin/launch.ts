#!/usr/bin/env bun
// Shared launcher: ensure the Plan Studio dev server is running, then (optionally)
// open the browser to a given plan slug — at most once per slug per boot.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { tmpdir } from "node:os";
import { HOST, PORT, APP_DIR } from "../lib/config";

const BASE = `http://${HOST}:${PORT}`;
const MARKER_DIR = join(tmpdir(), "plan-studio-opened");

async function isUp(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/plans`, {
      signal: AbortSignal.timeout(800),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureServer(): Promise<void> {
  if (await isUp()) return;
  const child = spawn("bun", ["run", "dev"], {
    cwd: APP_DIR,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  // wait up to ~30s: Next.js compiles routes on demand, so the first request
  // after a cold start can take several seconds.
  for (let i = 0; i < 150; i++) {
    await sleep(200);
    if (await isUp()) return;
  }
}

function openBrowser(url: string): void {
  // Linux/mac/win best-effort, non-blocking
  const cmd =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "explorer"
        : "xdg-open";
  const child = spawn(cmd, [url], { detached: true, stdio: "ignore" });
  child.unref();
}

function alreadyOpened(slug: string): boolean {
  mkdirSync(MARKER_DIR, { recursive: true });
  const marker = join(MARKER_DIR, encodeURIComponent(slug));
  if (existsSync(marker)) return true;
  writeFileSync(marker, "1");
  return false;
}

export async function launch(slug?: string, force = false): Promise<void> {
  await ensureServer();
  const url = slug ? `${BASE}/?plan=${encodeURIComponent(slug)}` : BASE;
  // Open once per slug unless forced (so repeated edits just live-reload).
  if (force || !slug || !alreadyOpened(slug)) openBrowser(url);
}

// CLI entry: `bun bin/launch.ts [slug] [--force]`
if (import.meta.main) {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const slug = args.find((a) => !a.startsWith("--"));
  await launch(slug, force);
  console.log(`Plan Studio: ${BASE}${slug ? `/?plan=${slug}` : ""}`);
}
