import { NextResponse, type NextRequest } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { log } from "@/lib/log";
import { site } from "@/lib/site";
import { exchangeDisplayCode, syncVideoStats } from "@/lib/tiktok/display";

const STATE_COOKIE = "tt_display_state";

/** Login Kit redirect. Register `<site>/api/admin/tiktok/videos/callback` in the TikTok developer app. */
export async function GET(request: NextRequest) {
  if ((await checkAdmin(request.headers.get("authorization"))) !== "ok") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const back = (query: string) => {
    const res = NextResponse.redirect(`${site.url}/admin?${query}`);
    res.cookies.delete({ name: STATE_COOKIE, path: "/api/admin/tiktok/videos" });
    res.headers.set("Cache-Control", "no-store");
    return res;
  };
  if (!code || !state || state !== request.cookies.get(STATE_COOKIE)?.value) return back("error=state_mismatch");
  try {
    await exchangeDisplayCode(code, `${site.url}/api/admin/tiktok/videos/callback`);
    await syncVideoStats();
    log.info("tiktok.display.connected");
    return back("videos=1");
  } catch (error) {
    log.error("tiktok.display.connect_failed", { error: String(error) });
    return back(`error=${encodeURIComponent(error instanceof Error ? error.message : "unknown")}`);
  }
}
