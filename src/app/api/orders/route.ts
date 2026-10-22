import { clientIp, json, publicOrigin, tooManyRequests } from "@/lib/http";
import { log } from "@/lib/log";
import { CheckoutError, createOrder, isOnlinePayment } from "@/lib/orders";
import { startPayment } from "@/lib/payments";
import { checkRateLimit, ORDER_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limited = await checkRateLimit("order", clientIp(request), ORDER_LIMITS);
  if (limited) return tooManyRequests(limited.retryAfter);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid", fields: [] }, 400);
  }
  try {
    const ip = clientIp(request);
    const order = await createOrder(body, { ip, userAgent: request.headers.get("user-agent") ?? undefined });
    if (!isOnlinePayment(order)) return json({ id: order.id, token: order.accessToken, total: order.total }, 201);

    // Online payment: hand the shopper to the gateway. If that fails the order still exists and
    // the order page offers to retry.
    try {
      const paymentUrl = await startPayment(order, { origin: publicOrigin(request), ip });
      return json({ id: order.id, token: order.accessToken, total: order.total, paymentUrl }, 201);
    } catch (error) {
      log.error("payment.start_failed", { orderId: order.id, error: String(error) });
      return json({ id: order.id, token: order.accessToken, total: order.total, paymentError: true }, 201);
    }
  } catch (error) {
    if (error instanceof CheckoutError) {
      if (error.code === "invalid") return json({ error: "invalid", fields: error.details.fields }, 400);
      return json({ error: error.code, quote: error.details.quote }, 409);
    }
    log.error("order.create_failed", { error: error instanceof Error ? error.stack : String(error) });
    return json({ error: "server_error" }, 500);
  }
}
