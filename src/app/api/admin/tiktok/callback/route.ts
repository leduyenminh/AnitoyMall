import { NextResponse, type NextRequest } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { log } from "@/lib/log";
import { site } from "@/lib/site";
import { exchangeAuthCode } from "@/lib/tiktok/auth";
import { TikTokShopClient } from "@/lib/tiktok/client";

const STATE_COOKIE = "tts_oauth_state";

/**
 * Step 2: TikTok redirects back here with `code` and our `state`. Register
 * `<site>/api/admin/tiktok/callback` as the redirect URL in TikTok Shop Partner Center.
 */
export async function GET(request: NextRequest) {
  if ((await checkAdmin(request.headers.get("authorization"))) !== "ok") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expected = request.cookies.get(STATE_COOKIE)?.value;
  const back = (query: string) => {
    const res = NextResponse.redirect(`${site.url}/admin?${query}`);
    res.cookies.delete({ name: STATE_COOKIE, path: "/api/admin/tiktok" });
    res.headers.set("Cache-Control", "no-store");
    return res;
  };

  if (!code || !state || !expected || state !== expected) return back("error=state_mismatch");
  try {
    await exchangeAuthCode(code);
    // Resolve and store the shop cipher right away so the first sync can run.
    await (await TikTokShopClient.create())?.resolveShop();
    log.info("tiktok.connected");
    return back("connected=1");
  } catch (error) {
    log.error("tiktok.connect_failed", { error: String(error) });
    return back(`error=${encodeURIComponent(error instanceof Error ? error.message : "unknown")}`);
  }
}
