import { log } from "@/lib/log";
import { ensureFreshToken } from "@/lib/tiktok/auth";
import { syncCatalog } from "@/lib/tiktok/sync";

/**
 * Scheduled by EventBridge Scheduler. Keeps the TikTok access token fresh (it lasts about a week,
 * so refresh a day ahead) and reconciles the catalog and inventory with TikTok Shop. Webhooks
 * deliver most changes in near real time; this run catches anything they missed.
 */
export async function handler() {
  await ensureFreshToken(24 * 3600);
  const result = await syncCatalog();
  log.info("sync.handler.done", { ...result });
  return result;
}
