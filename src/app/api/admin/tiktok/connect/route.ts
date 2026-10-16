import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { authorizeUrl } from "@/lib/tiktok/auth";
import { loadCredentials } from "@/lib/tiktok/credentials";

const STATE_COOKIE = "tts_oauth_state";

/** Step 1 of TikTok Shop authorization: send the seller to TikTok with an anti-CSRF state. */
export async function GET(request: Request) {
  if ((await checkAdmin(request.headers.get("authorization"))) !== "ok") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const { serviceId } = await loadCredentials({ fresh: true });
  if (!serviceId) return new NextResponse("TIKTOK_SERVICE_ID is not configured", { status: 503 });

  const state = randomBytes(16).toString("hex");
  const response = NextResponse.redirect(authorizeUrl(serviceId, state));
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto") === "https",
    sameSite: "lax",
    path: "/api/admin/tiktok",
    maxAge: 600,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
