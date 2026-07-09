# Plan Studio

Local browser planning environment for Claude Code. Renders plans from
`~/.claude/plans/*.md` richly (diagrams, GitHub diffs, live code refs), lets you
edit any section, and gives you a separate-model side chat — all local.

Built with **Next.js (App Router) + React + TypeScript + Tailwind CSS**, on Bun.

## Run

```bash
bun install
bun run dev   # http://127.0.0.1:4317
```

Or just write/finish a plan: a `PreToolUse` hook on `ExitPlanMode` ensures the
dev server is up and opens the browser to the new plan. Manual open: `/plan-studio [slug]`.

## Architecture

- `app/page.tsx` — the three-column shell (sidebar / doc+TOC / chat), a client component wiring hooks to UI.
- `app/api/*/route.ts` — route handlers: `plans`, `plans/[slug]`, `file`, `events` (SSE), `chat/[slug]` (SSE), `threads/[slug]`.
- `app/globals.css` — Tailwind + the design tokens (`--bg`, `--panel`, `--text`, …), keyed off a `.light` class on `<html>` rather than `prefers-color-scheme`.
- `lib/plans.ts` — list/read/write plans + frontmatter; optimistic-concurrency via content hash.
- `lib/fileread.ts` — **realpath-jailed** read-only file slices for `code-ref` blocks.
- `lib/watch.ts` — `fs.watch` → SSE live reload.
- `lib/chat.ts` — side chat via headless `claude -p --model claude-haiku-4-5` (reuses your login; tools disabled).
- `lib/threads.ts` — chat thread persistence under `threads/`.
- `lib/markdown.ts` — pure plan-body parser (sections, fenced `mermaid`/`plan-diff`/`code-ref`/`callout`/`resource` blocks); unit-tested in `lib/markdown.test.ts` (`bun test`).
- `hooks/*` — one hook per concern: `usePlans`, `useDoc`, `useChat`, `useSelection`, `useTheme`, `useResizable`, `useLiveReload`, `useMermaid`, `useCodeRefs`, `useDiff`, `useMarkdown`, `useToast`.
- `components/*` — presentational components consuming those hooks; `components/blocks/*` renders the six plan block types.
- `bin/launch.ts` / `bin/on-plan-write.ts` — dev-server launcher + hook target.
- `plugin/` — thin plugin (command, hook, `plan-studio` skill = the authoring contract).

## UI

The UI is implemented directly in this codebase (React + Tailwind) — Claude Design
may be used as a **visual reference** to draw from, but nothing is imported or
pulled from it; there's no design-sync pipeline. Visual changes are ordinary
code changes here.

## Commits

Plain [Conventional Commits](https://www.conventionalcommits.org/) —
`feat`/`fix`/`refactor`/`chore`, scoped where useful (`feat(ui): …`, `fix(api): …`).

## API

| Method + path | Purpose |
|---|---|
| `GET /api/plans` | list plans |
| `GET /api/plans/:slug` | raw markdown + frontmatter + version |
| `PUT /api/plans/:slug` | save (send `x-base-version` for conflict detection → 409) |
| `GET /api/file?root=&path=&start=&end=` | jailed file slice |
| `GET /api/events` | SSE live-reload |
| `POST /api/chat/:slug` | SSE chat stream (`{messages, section}`) |
| `GET/PUT /api/threads/:slug` | chat thread persistence |

## Config (env)

`PLAN_STUDIO_HOST` (127.0.0.1), `PLAN_STUDIO_PORT` (4317),
`PLAN_STUDIO_CHAT_MODEL` (claude-haiku-4-5).
