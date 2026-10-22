import { NextResponse } from "next/server";
import { checkAdmin } from "./admin-auth";

export const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * The shopper's IP. On AWS a CloudFront function sets x-viewer-ip and overwrites any value the
 * viewer sent (the proxy only admits requests that came through CloudFront). Elsewhere (dev, a
 * plain container) fall back to the first X-Forwarded-For hop, which the client can choose.
 */
export function clientIp(request: Request): string | undefined {
  return (
    request.headers.get("x-viewer-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    undefined
  );
}

/** 429 with Retry-After, for rate-limited public endpoints. */
export const tooManyRequests = (retryAfter: number) =>
  NextResponse.json(
    { error: "rate_limited", retryAfter },
    { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(retryAfter) } },
  );

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

/**
 * Public origin for links handed to third parties (payment return URLs). Uses the deployed
 * SITE_URL when known, otherwise the host the shopper is browsing (dev, previews).
 */
export function publicOrigin(request: Request): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${host}`;
}
