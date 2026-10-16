import { config } from "@/lib/config";
import { publish } from "@/lib/events/publish";
import { json, requireAdminMutation } from "@/lib/http";
import { syncCatalog } from "@/lib/tiktok/sync";

/** Start a catalog sync. On AWS it is queued for the worker; locally it runs right away. */
export async function POST(request: Request) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;

  if (config.aws.eventsQueueUrl) {
    await publish({ type: "catalog.sync", reason: "admin" });
    return json({ message: "Sync queued – refresh in a minute." }, 202);
  }
  try {
    const result = await syncCatalog();
    return json({
      message: result.skipped ?? `Synced ${result.synced} listings (${result.changed} changed, ${result.archived} archived).`,
      result,
    });
  } catch (error) {
    return json({ error: String(error) }, 502);
  }
}
