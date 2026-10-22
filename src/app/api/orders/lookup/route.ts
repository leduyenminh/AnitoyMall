import { z } from "zod";
import { json } from "@/lib/http";
import { lookupOrder } from "@/lib/orders";

const schema = z.object({ id: z.string().max(30), phone: z.string().max(30) });

/** "Find my order": order code + phone in, a masked summary out (see lookupOrder). */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid" }, 400);
  const order = await lookupOrder(parsed.data.id, parsed.data.phone);
  return order ? json({ order }) : json({ error: "not_found" }, 404);
}
