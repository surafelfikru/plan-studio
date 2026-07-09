import { json } from "@/lib/http";
import { listPlans } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function GET() {
  return json({ plans: await listPlans() });
}
