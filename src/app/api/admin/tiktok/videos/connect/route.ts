import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { site } from "@/lib/site";
import { loadCredentials } from "@/lib/tiktok/credentials";
import { displayAuthorizeUrl } from "@/lib/tiktok/display";

const STATE_COOKIE = "tt_display_state";

/** Ask the creator to let the site read their TikTok videos and view counts (Login Kit). */
export async function GET(request: Request) {
  if ((await checkAdmin(request.headers.get("authorization"))) !== "ok") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const { displayClientKey } = await loadCredentials({ fresh: true });
  if (!displayClientKey) return new NextResponse("TIKTOK_DISPLAY_CLIENT_KEY is not configured", { status: 503 });

  const state = randomBytes(16).toString("hex");
  const redirectUri = `${site.url}/api/admin/tiktok/videos/callback`;
  const response = NextResponse.redirect(displayAuthorizeUrl(displayClientKey, redirectUri, state));
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: site.url.startsWith("https://"),
    sameSite: "lax",
    path: "/api/admin/tiktok/videos",
    maxAge: 600,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
