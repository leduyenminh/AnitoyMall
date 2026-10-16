import { log } from "@/lib/log";
import { syncAll } from "@/lib/tiktok/sync";

/**
 * Scheduled by EventBridge Scheduler. Refreshes TikTok tokens, reconciles the catalog and
 * inventory with TikTok Shop, and updates video view counts from the TikTok Display API.
 * Webhooks deliver most catalog changes in near real time; this run catches anything they missed.
 */
export async function handler() {
  const result = await syncAll();
  log.info("sync.handler.done", { catalog: result.catalog, videos: result.videos });
  if (result.errors.length) throw new Error(result.errors.join("; "));
  return result;
}
