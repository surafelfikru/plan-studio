#!/usr/bin/env bun
// Hook target. Reads the hook JSON on stdin and opens Plan Studio to the right
// plan. Handles two triggers:
//   - ExitPlanMode  -> open the most-recently-modified plan (the one just written)
//   - Write/Edit to ~/.claude/plans/*.md -> open that specific plan
// Stays silent and non-blocking otherwise; never interrupts the main session.
import { basename } from "node:path";
import { PLANS_DIR } from "../lib/config";
import { listPlans } from "../lib/plans";
import { launch } from "./launch";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

async function resolveSlug(payload: any): Promise<string | undefined> {
  const filePath: string | undefined =
    payload?.tool_input?.file_path ?? payload?.tool_input?.path;

  if (filePath && filePath.startsWith(PLANS_DIR) && filePath.endsWith(".md")) {
    return basename(filePath).replace(/\.md$/, "");
  }

  // ExitPlanMode (or anything without a plan path): open the newest plan.
  if (payload?.tool_name === "ExitPlanMode") {
    const plans = await listPlans(); // sorted newest-first
    return plans[0]?.slug;
  }

  return undefined;
}

async function main() {
  let raw = "";
  try {
    raw = await readStdin();
  } catch {
    return;
  }
  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return;
  }

  const slug = await resolveSlug(payload);
  if (!slug) return;

  try {
    await launch(slug);
  } catch {
    // never let a hook failure interrupt the main session
  }
}

await main();
