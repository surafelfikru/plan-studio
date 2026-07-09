import { json } from "@/lib/http";
import { SSE_HEADERS, sseMessage } from "@/lib/sse";
import { readPlan } from "@/lib/plans";
import { runChatTurn, type ChatMessage } from "@/lib/chat";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: Params) {
  const { slug } = await params;
  const doc = await readPlan(decodeURIComponent(slug));
  if (!doc) return json({ error: "plan not found" }, 404);

  const body = (await req.json()) as { messages: ChatMessage[]; section?: string };
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
          { planTitle: doc.title, planBody: doc.body, section: body.section },
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
