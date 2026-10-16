import { createHash } from "node:crypto";
import { phoneToE164 } from "../checkout/validation";
import { fromMinorUnits } from "../money";
import { site } from "../site";
import type { Order } from "../types";
import { loadCredentials } from "./credentials";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/**
 * Report a conversion to the TikTok Events API (server side). The same `event_id` is fired by the
 * browser pixel on the order page, so TikTok de-duplicates the pair and still attributes orders
 * when ad blockers stop the pixel. Personal data is SHA-256 hashed as TikTok requires.
 */
export async function trackOrderEvent(event: "PlaceAnOrder" | "CompletePayment", order: Order): Promise<void> {
  const { eventsAccessToken } = await loadCredentials();
  if (!site.pixelId || !eventsAccessToken) return;

  const body = {
    event_source: "web",
    event_source_id: site.pixelId,
    data: [
      {
        event,
        event_time: Math.floor(Date.now() / 1000),
        event_id: `${order.id}-${event}`,
        user: {
          phone: sha256(phoneToE164(order.customer.phone)),
          ...(order.customer.email ? { email: sha256(order.customer.email.trim().toLowerCase()) } : {}),
          external_id: sha256(order.customer.phone),
          ...(order.attribution?.ttclid ? { ttclid: order.attribution.ttclid } : {}),
          ...(order.attribution?.ttp ? { ttp: order.attribution.ttp } : {}),
          ...(order.attribution?.ip ? { ip: order.attribution.ip } : {}),
          ...(order.attribution?.userAgent ? { user_agent: order.attribution.userAgent } : {}),
        },
        properties: {
          currency: order.currency,
          value: fromMinorUnits(order.total, order.currency),
          content_type: "product",
          order_id: order.id,
          contents: order.lines.map((l) => ({
            content_id: l.productId,
            content_name: l.title,
            quantity: l.quantity,
            price: fromMinorUnits(l.unitPrice, order.currency),
          })),
        },
        page: { url: order.attribution?.pageUrl ?? `${site.url}/checkout` },
      },
    ],
  };

  const res = await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
    method: "POST",
    headers: { "Access-Token": eventsAccessToken, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { code?: number; message?: string };
  if (!res.ok || json.code !== 0) throw new Error(`TikTok Events API: ${json.code} ${json.message}`);
}
