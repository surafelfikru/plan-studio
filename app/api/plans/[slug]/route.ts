import { json } from "@/lib/http";
import { readPlan, writePlan } from "@/lib/plans";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params;
  const doc = await readPlan(decodeURIComponent(slug));
  return doc ? json(doc) : json({ error: "not found" }, 404);
}

export async function PUT(req: Request, { params }: Params) {
  const { slug } = await params;
  const content = await req.text();
  const baseVersion = req.headers.get("x-base-version") ?? undefined;
  const result = await writePlan(decodeURIComponent(slug), content, baseVersion);
  if (result.conflict) return json({ error: "conflict", current: result.doc }, 409);
  if (!result.ok) return json({ error: "bad slug" }, 400);
  return json({ ok: true, doc: result.doc });
}
