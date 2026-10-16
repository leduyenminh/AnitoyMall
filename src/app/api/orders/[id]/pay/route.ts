import { clientIp, json, publicOrigin } from "@/lib/http";
import { log } from "@/lib/log";
import { getOrderForViewer, isOnlinePayment } from "@/lib/orders";
import { startPayment } from "@/lib/payments";

/** Retry an online payment for an unpaid order (needs the order's access token). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { token } = ((await request.json().catch(() => ({}))) ?? {}) as { token?: string };
  const order = await getOrderForViewer(id, token);
  if (!order) return json({ error: "not_found" }, 404);
  if (!isOnlinePayment(order) || order.paymentStatus === "paid" || order.status === "cancelled") {
    return json({ error: "not_payable" }, 409);
  }
  try {
    return json({ paymentUrl: await startPayment(order, { origin: publicOrigin(request), ip: clientIp(request) }) });
  } catch (error) {
    log.error("payment.retry_failed", { orderId: id, error: String(error) });
    return json({ error: "gateway_error" }, 502);
  }
}
