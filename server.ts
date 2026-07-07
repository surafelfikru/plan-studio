import { join, normalize } from "node:path";
import { existsSync } from "node:fs";
import { HOST, PORT, PUBLIC_DIR } from "./lib/config.ts";
import { listPlans, readPlan, writePlan } from "./lib/plans.ts";
import { readFileSlice, FileReadError } from "./lib/fileread.ts";
import { addWatchClient } from "./lib/watch.ts";
import { runChatTurn, type ChatMessage } from "./lib/chat.ts";
import { readThreads, writeThreads, type ThreadFile } from "./lib/threads.ts";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

const SSE_HEADERS = {
  "content-type": "text/event-stream",
  "cache-control": "no-cache",
  connection: "keep-alive",
};

function sseMessage(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// ---- static (imported Plan Studio UI lives in PUBLIC_DIR) -------------------

const PLACEHOLDER = `<!doctype html><meta charset=utf8>
<title>Plan Studio (dev)</title>
<body style="font:14px system-ui;max-width:680px;margin:3rem auto;padding:0 1rem">
<h1>Plan Studio — backend is live</h1>
<p>The UI has not been imported yet. The API is serving real data:</p>
<ul>
  <li><a href="/api/plans">/api/plans</a></li>
</ul>
<p>Run <code>/design-login</code> then import the design into
<code>public/</code> to replace this page.</p>
<pre id="out">loading…</pre>
<script>
fetch('/api/plans').then(r=>r.json()).then(d=>{
  document.getElementById('out').textContent = JSON.stringify(d,null,2);
});
</script>`;

async function serveStatic(pathname: string): Promise<Response> {
  const rel = pathname === "/" ? "/index.html" : pathname;
  // prevent path traversal in static serving
  const safe = normalize(rel).replace(/^(\.\.[/\\])+/, "");
  const full = join(PUBLIC_DIR, safe);
  if (!full.startsWith(PUBLIC_DIR)) return new Response("forbidden", { status: 403 });
  const file = Bun.file(full);
  if (await file.exists()) return new Response(file);
  if (rel === "/index.html") {
    return new Response(PLACEHOLDER, {
      headers: { "content-type": "text/html" },
    });
  }
  return new Response("not found", { status: 404 });
}

// ---- routes -----------------------------------------------------------------

async function handle(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const { pathname } = url;
  const method = req.method;

  // GET /api/plans
  if (pathname === "/api/plans" && method === "GET") {
    return json({ plans: await listPlans() });
  }

  // /api/plans/:slug
  const planMatch = pathname.match(/^\/api\/plans\/([^/]+)$/);
  if (planMatch) {
    const slug = decodeURIComponent(planMatch[1]);
    if (method === "GET") {
      const doc = await readPlan(slug);
      return doc ? json(doc) : json({ error: "not found" }, 404);
    }
    if (method === "PUT") {
      const content = await req.text();
      const baseVersion = req.headers.get("x-base-version") ?? undefined;
      const result = await writePlan(slug, content, baseVersion);
      if (result.conflict) {
        return json({ error: "conflict", current: result.doc }, 409);
      }
      if (!result.ok) return json({ error: "bad slug" }, 400);
      return json({ ok: true, doc: result.doc });
    }
    return json({ error: "method not allowed" }, 405);
  }

  // GET /api/file?root=&path=&start=&end=
  if (pathname === "/api/file" && method === "GET") {
    const root = url.searchParams.get("root") ?? "";
    const path = url.searchParams.get("path") ?? "";
    const start = Number(url.searchParams.get("start") ?? 1);
    const end = Number(url.searchParams.get("end") ?? Number.MAX_SAFE_INTEGER);
    try {
      const slice = await readFileSlice(root, path, start, end);
      return json(slice);
    } catch (e) {
      if (e instanceof FileReadError) return json({ error: e.message }, e.status);
      return json({ error: "read failed" }, 500);
    }
  }

  // GET /api/events  (SSE: live reload)
  if (pathname === "/api/events" && method === "GET") {
    let unregister = () => {};
    const stream = new ReadableStream({
      start(controller) {
        const enc = new TextEncoder();
        controller.enqueue(enc.encode(sseMessage("hello", { ok: true })));
        unregister = addWatchClient((event, data) => {
          controller.enqueue(enc.encode(sseMessage(event, data)));
        });
        req.signal.addEventListener("abort", () => {
          unregister();
          try {
            controller.close();
          } catch {}
        });
      },
      cancel() {
        unregister();
      },
    });
    return new Response(stream, { headers: SSE_HEADERS });
  }

  // POST /api/chat/:slug  (SSE: streamed chat turn)
  const chatMatch = pathname.match(/^\/api\/chat\/([^/]+)$/);
  if (chatMatch && method === "POST") {
    const slug = decodeURIComponent(chatMatch[1]);
    const doc = await readPlan(slug);
    if (!doc) return json({ error: "plan not found" }, 404);
    const body = (await req.json()) as {
      messages: ChatMessage[];
      section?: string;
    };
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return json({ error: "messages required" }, 400);
    }

    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        const send = (event: string, data: unknown) =>
          controller.enqueue(enc.encode(sseMessage(event, data)));
        try {
          const full = await runChatTurn(
            body.messages,
            {
              planTitle: doc.title,
              planBody: doc.body,
              section: body.section,
            },
            (text) => send("delta", { text }),
            req.signal,
          );
          send("done", { text: full });
        } catch (e) {
          send("error", { message: String(e) });
        } finally {
          try {
            controller.close();
          } catch {}
        }
      },
    });
    return new Response(stream, { headers: SSE_HEADERS });
  }

  // /api/threads/:slug
  const threadMatch = pathname.match(/^\/api\/threads\/([^/]+)$/);
  if (threadMatch) {
    const slug = decodeURIComponent(threadMatch[1]);
    if (method === "GET") return json(await readThreads(slug));
    if (method === "PUT") {
      const data = (await req.json()) as ThreadFile;
      const ok = await writeThreads(slug, { slug, threads: data.threads ?? [] });
      return ok ? json({ ok: true }) : json({ error: "bad slug" }, 400);
    }
  }

  // static / UI
  if (method === "GET") return serveStatic(pathname);
  return json({ error: "not found" }, 404);
}

const server = Bun.serve({
  hostname: HOST,
  port: PORT,
  idleTimeout: 0, // keep SSE connections open
  fetch: handle,
  error(e) {
    console.error("[plan-studio] error:", e);
    return json({ error: "internal" }, 500);
  },
});

console.log(`[plan-studio] http://${server.hostname}:${server.port}`);
if (!existsSync(join(PUBLIC_DIR, "index.html"))) {
  console.log("[plan-studio] UI not imported yet — serving dev placeholder at /");
}
