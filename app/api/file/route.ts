import { json } from "@/lib/http";
import { readFileSlice, FileReadError } from "@/lib/fileread";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
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
