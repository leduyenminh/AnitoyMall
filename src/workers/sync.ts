import { log } from "@/lib/log";
import { expireUnpaidOrders } from "@/lib/orders";
import { syncAll } from "@/lib/tiktok/sync";

/**
 * Scheduled by EventBridge Scheduler. Releases stock held by online-payment orders that were never
 * paid, refreshes TikTok tokens, reconciles the catalog and inventory with TikTok Shop, and updates
 * video view counts from the TikTok Display API. Webhooks deliver most catalog changes in near real
 * time; this run catches anything they missed.
 */
export async function handler() {
  await expireUnpaidOrders().catch((error) => log.error("orders.expire_failed", { error: String(error) }));
  const result = await syncAll();
  log.info("sync.handler.done", { catalog: result.catalog, videos: result.videos });
  if (result.errors.length) throw new Error(result.errors.join("; "));
  return result;
}
