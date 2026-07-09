import { watch } from "node:fs";
import { PLANS_DIR } from "./config";

type Client = (event: string, data: unknown) => void;

const clients = new Set<Client>();
let started = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function broadcast(event: string, data: unknown) {
  for (const send of clients) {
    try {
      send(event, data);
    } catch {
      // client gone; it will be removed on its own close handler
    }
  }
}

/** Start watching the plans dir once; coalesces bursts of fs events. */
function ensureWatching() {
  if (started) return;
  started = true;
  try {
    watch(PLANS_DIR, (_eventType, filename) => {
      if (filename && !String(filename).endsWith(".md")) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        broadcast("plans-changed", {
          slug: filename ? String(filename).replace(/\.md$/, "") : null,
        });
      }, 80);
    });
  } catch {
    // plans dir may not exist yet; watching is best-effort
    started = false;
  }
}

/**
 * Register an SSE client. Returns an unregister function.
 * `send` should serialize and write one SSE message.
 */
export function addWatchClient(send: Client): () => void {
  ensureWatching();
  clients.add(send);
  return () => clients.delete(send);
}
