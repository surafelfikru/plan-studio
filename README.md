# Plan Studio

Local browser planning environment for Claude Code. Renders plans from
`~/.claude/plans/*.md` richly (diagrams, GitHub diffs, live code refs), lets you
edit any section, and gives you a separate-model side chat — all local.

## Run

```bash
bun run /home/sura/.claude/plan-studio/server.ts   # http://127.0.0.1:4317
```

Or just write/finish a plan: a `PreToolUse` hook on `ExitPlanMode` ensures the
server is up and opens the browser to the new plan. Manual open: `/plan-studio [slug]`.

## Architecture

- `server.ts` — bun HTTP + SSE, static UI from `public/`.
- `lib/plans.ts` — list/read/write plans + frontmatter; optimistic-concurrency via content hash.
- `lib/fileread.ts` — **realpath-jailed** read-only file slices for `code-ref` blocks.
- `lib/watch.ts` — `fs.watch` → SSE live reload.
- `lib/chat.ts` — side chat via headless `claude -p --model claude-haiku-4-5` (reuses your login; tools disabled).
- `lib/threads.ts` — chat thread persistence under `threads/`.
- `bin/launch.ts` / `bin/on-plan-write.ts` — server launcher + hook target.
- `plugin/` — thin plugin (command, hook, `plan-studio` skill = the authoring contract).

## UI ⇄ logic seam

| Path | Owner | Role |
|------|-------|------|
| `public/Plan Studio.dc.html` | **Claude Design** | The UI — `<style>` + markup, authored visually in Claude Design and shipped whole. Also hosts the dc component `<script>` region. |
| `public/support.js` | vendor | dc-runtime React runtime. |
| `public/_script.js` | **logic** | Canonical source for the dc component logic (`renderVals`, mermaid, chat, selection/tweaks, API). Kept in-repo so it survives UI re-imports; integrated into the `.dc.html` script region. |
| `server.ts`, `lib/*`, `bin/*`, `plugin/*` | **logic** | Backend + tooling. |

The UI is authored in **Claude Design**. Claude Code does **not** hand-edit the
visual layer — it owns logic and wiring only. There is no splicer; the
`_script.js` → `.dc.html` script-region integration is done directly.

**One-way import loop:**
1. You share a Claude Design link.
2. Claude pulls the design's `Plan Studio.dc.html` → commits it as the UI baseline (`design:`).
3. Claude integrates the maintained `_script.js`, refactors logic, wires new markup (`logic:`).
4. Claude reports back any UI changes the design must make that logic can't cover.

## Commit provenance

So you can always trace and revert by origin:

- **`design:` …** — authored `Claude Design <design@anthropic.com>`. Anything from the Claude Design file (style, markup).
- **`logic:` …** — authored by the maintainer / Claude Code. Server, libs, component logic, tooling.

```
git log --author="Claude Design"   # everything the design shipped
git log --author="Claude Code"      # everything logic-side
git log --oneline                    # prefixes make the seam obvious
```

Because dc-runtime bundles style + markup + script in one file, the `.dc.html`
is touched by both kinds of commit; `git blame` attributes each line to its origin.

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
