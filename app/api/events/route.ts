import { SSE_HEADERS, sseMessage } from "@/lib/sse";
import { addWatchClient } from "@/lib/watch";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
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
