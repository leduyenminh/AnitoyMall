import { NextResponse } from "next/server";
import { checkAdmin } from "./admin-auth";

export const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** First hop in X-Forwarded-For (set by CloudFront) or nothing. */
export function clientIp(request: Request): string | undefined {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
}

/**
 * Browsers attach cached Basic-auth credentials to cross-site requests, so admin mutations also
 * require a same-origin JSON request (which a third-party page cannot forge without CORS).
 */
export async function requireAdminMutation(request: Request): Promise<NextResponse | null> {
  if ((await checkAdmin(request.headers.get("authorization"))) !== "ok") return json({ error: "unauthorized" }, 401);
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return json({ error: "cross-site request rejected" }, 403);
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ error: "expected application/json" }, 415);
  }
  return null;
}
