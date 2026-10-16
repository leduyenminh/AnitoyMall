import { clientIp, json } from "@/lib/http";
import { log } from "@/lib/log";
import { CheckoutError, createOrder } from "@/lib/orders";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid", fields: [] }, 400);
  }
  try {
    const order = await createOrder(body, { ip: clientIp(request), userAgent: request.headers.get("user-agent") ?? undefined });
    return json({ id: order.id, token: order.accessToken, total: order.total }, 201);
  } catch (error) {
    if (error instanceof CheckoutError) {
      return error.code === "invalid"
        ? json({ error: "invalid", fields: error.details.fields }, 400)
        : json({ error: "quote_changed", quote: error.details.quote }, 409);
    }
    log.error("order.create_failed", { error: error instanceof Error ? error.stack : String(error) });
    return json({ error: "server_error" }, 500);
  }
}
