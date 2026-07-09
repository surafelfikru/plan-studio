import { json } from "@/lib/http";
import { readThreads, writeThreads, type ThreadFile } from "@/lib/threads";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params;
  return json(await readThreads(decodeURIComponent(slug)));
}

export async function PUT(req: Request, { params }: Params) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const data = (await req.json()) as ThreadFile;
  const ok = await writeThreads(slug, { slug, threads: data.threads ?? [] });
  return ok ? json({ ok: true }) : json({ error: "bad slug" }, 400);
}
