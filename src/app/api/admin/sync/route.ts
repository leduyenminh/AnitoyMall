import { config } from "@/lib/config";
import { publish } from "@/lib/events/publish";
import { json, requireAdminMutation } from "@/lib/http";
import { syncAll } from "@/lib/tiktok/sync";

/** Sync TikTok Shop catalog and video view counts. On AWS it is queued; locally it runs right away. */
export async function POST(request: Request) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;

  if (config.aws.eventsQueueUrl) {
    await publish({ type: "catalog.sync", reason: "admin" });
    return json({ message: "Sync queued – refresh in a minute." }, 202);
  }
  const { catalog, videos, errors } = await syncAll();
  const parts = [
    catalog?.skipped ?? (catalog && `Shop: ${catalog.synced} listings (${catalog.changed} changed, ${catalog.archived} archived)`),
    videos?.skipped ?? (videos && `Videos: ${videos.videos} (${videos.added} new)`),
    ...errors,
  ].filter(Boolean);
  return json({ message: parts.join(" · "), catalog, videos, errors }, errors.length ? 502 : 200);
}
