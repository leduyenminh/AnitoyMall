import { log } from "../log";
import { sendOrderEmails } from "../notify";
import { getRepository } from "../repo";
import { TikTokShopClient } from "../tiktok/client";
import { saveCredentials } from "../tiktok/credentials";
import { trackOrderEvent } from "../tiktok/events-api";
import { adjustTikTokInventory, refreshProduct, syncAll } from "../tiktok/sync";
import { TtsEventType, type TtsNotification } from "../tiktok/types";
import type { Order } from "../types";
import type { DomainEvent } from "./types";

const DEDUPE_TTL = 14 * 24 * 3600;

/**
 * Messages are delivered at least once, and a handler may fail half-way and be retried. Each side
 * effect is therefore recorded once it succeeds, and skipped on later deliveries.
 */
async function step(key: string, run: () => Promise<void>): Promise<void> {
  const repo = await getRepository();
  const marker = `step:${key}`;
  if (await repo.isEventClaimed(marker)) return;
  await run();
  await repo.claimEvent(marker, DEDUPE_TTL);
}

async function loadOrder(orderId: string): Promise<Order> {
  const order = await (await getRepository()).getOrder(orderId);
  if (!order) throw new Error(`Order ${orderId} not found`);
  return order;
}

function inventoryLines(order: Order, sign: -1 | 1) {
  return order.lines.map((l) => ({
    productId: l.productId,
    skuId: l.skuId,
    tiktokProductId: l.tiktokProductId,
    tiktokSkuId: l.tiktokSkuId,
    delta: sign * l.quantity,
  }));
}

async function onTikTokNotification(n: TtsNotification) {
  const repo = await getRepository();
  if (!(await repo.claimEvent(`tts:${n.tts_notification_id}`, DEDUPE_TTL))) {
    log.info("tiktok.webhook.duplicate", { id: n.tts_notification_id });
    return;
  }
  try {
    switch (n.type) {
      case TtsEventType.ORDER_STATUS_CHANGE:
      case TtsEventType.REVERSE_ORDER_STATUS_CHANGE: {
        // A TikTok order or return moved stock: re-read the affected listings.
        const orderId = n.data?.order_id;
        const client = orderId ? await TikTokShopClient.create() : null;
        if (!client || !orderId) return;
        const { orders } = await client.getOrders([orderId]);
        const productIds = new Set(
          (orders ?? []).flatMap((o) => o.line_items ?? []).flatMap((li) => (li.product_id ? [li.product_id] : [])),
        );
        for (const id of productIds) await refreshProduct(id);
        return;
      }
      case TtsEventType.PRODUCT_STATUS_CHANGE:
        if (n.data?.product_id) await refreshProduct(n.data.product_id);
        return;
      case TtsEventType.SELLER_DEAUTHORIZATION:
        await saveCredentials({ accessToken: undefined, refreshToken: undefined, shopCipher: undefined });
        log.warn("tiktok.deauthorized", { shopId: n.shop_id });
        return;
      default:
        log.info("tiktok.webhook.ignored", { type: n.type });
    }
  } catch (error) {
    // Let the retry process it again rather than treating it as handled.
    await repo.releaseEvent(`tts:${n.tts_notification_id}`);
    throw error;
  }
}

export async function handleEvent(event: DomainEvent): Promise<void> {
  switch (event.type) {
    case "order.created": {
      const order = await loadOrder(event.orderId);
      await step(`${order.id}:tiktok-inventory`, () => adjustTikTokInventory(inventoryLines(order, -1)));
      await step(`${order.id}:events-api`, () => trackOrderEvent("PlaceAnOrder", order));
      await step(`${order.id}:email`, () => sendOrderEmails(order));
      return;
    }
    case "order.cancelled": {
      const order = await loadOrder(event.orderId);
      await step(`${order.id}:tiktok-inventory-return`, () => adjustTikTokInventory(inventoryLines(order, 1)));
      return;
    }
    case "order.paid": {
      const order = await loadOrder(event.orderId);
      await step(`${order.id}:events-api-paid`, () => trackOrderEvent("CompletePayment", order));
      return;
    }
    case "tiktok.notification":
      await onTikTokNotification(event.notification);
      return;
    case "catalog.sync": {
      const { errors } = await syncAll();
      if (errors.length) throw new Error(errors.join("; "));
      return;
    }
  }
}
