import { z } from "zod";
import { clientIp, json, tooManyRequests } from "@/lib/http";
import { lookupOrder } from "@/lib/orders";
import { checkRateLimit, LOOKUP_LIMITS } from "@/lib/rate-limit";

const schema = z.object({ id: z.string().max(30), phone: z.string().max(30) });

/** "Find my order": order code + phone in, a masked summary out (see lookupOrder). */
export async function POST(request: Request) {
  const limited = await checkRateLimit("lookup", clientIp(request), LOOKUP_LIMITS);
  if (limited) return tooManyRequests(limited.retryAfter);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid" }, 400);
  const order = await lookupOrder(parsed.data.id, parsed.data.phone);
  return order ? json({ order }) : json({ error: "not_found" }, 404);
}
