import { publish } from "@/lib/events/publish";
import { json } from "@/lib/http";
import { log } from "@/lib/log";
import { loadCredentials } from "@/lib/tiktok/credentials";
import { verifyWebhookSignature } from "@/lib/tiktok/sign";
import type { TtsNotification } from "@/lib/tiktok/types";

/**
 * TikTok Shop webhook receiver. Verifies the signature on the raw body, enqueues the event and
 * answers immediately (TikTok expects a response within a few seconds and retries otherwise).
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const { appKey, appSecret } = await loadCredentials();
  if (!appKey || !appSecret) return json({ error: "not configured" }, 503);

  const valid = verifyWebhookSignature({
    rawBody,
    signature: request.headers.get("authorization"),
    appKey,
    appSecret,
  });
  if (!valid) {
    log.warn("tiktok.webhook.bad_signature");
    return json({ error: "invalid signature" }, 401);
  }

  let notification: TtsNotification;
  try {
    notification = JSON.parse(rawBody) as TtsNotification;
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  if (!notification.tts_notification_id || typeof notification.type !== "number") {
    return json({ error: "unexpected payload" }, 400);
  }

  await publish({ type: "tiktok.notification", notification });
  log.info("tiktok.webhook.accepted", { id: notification.tts_notification_id, type: notification.type });
  return new Response(null, { status: 200 });
}
