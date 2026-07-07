import { homedir } from "node:os";
import { join } from "node:path";

export const HOME = homedir();
export const CLAUDE_DIR = join(HOME, ".claude");
export const PLANS_DIR = join(CLAUDE_DIR, "plans");
export const APP_DIR = join(CLAUDE_DIR, "plan-studio");
export const PUBLIC_DIR = join(APP_DIR, "public");
export const THREADS_DIR = join(APP_DIR, "threads");

export const HOST = process.env.PLAN_STUDIO_HOST ?? "127.0.0.1";
export const PORT = Number(process.env.PLAN_STUDIO_PORT ?? 4317);

// Model for the side-chat pane. Headless `claude -p` reuses the existing login.
export const CHAT_MODEL =
  process.env.PLAN_STUDIO_CHAT_MODEL ?? "claude-haiku-4-5";
