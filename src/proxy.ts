import { NextResponse, type NextRequest } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";

const HAS_EXTENSION = /\.[a-z0-9]+$/i;
const LOCALE_PREFIX = /^\/(?:vi|en)(?:\/|$)/;
const ADMIN_PATH = /^\/(?:(?:en|vi)\/)?admin(?:\/|$)|^\/api\/admin(?:\/|$)/;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only CloudFront may reach the origin directly: it adds a secret header to every request.
  // (The health probe is exempt: the Lambda Web Adapter calls it locally during start-up.)
  const originSecret = process.env.ORIGIN_VERIFY_SECRET;
  const fromCloudFront = Boolean(originSecret) && request.headers.get("x-origin-verify") === originSecret;
  if (originSecret && !fromCloudFront && pathname !== "/api/health") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Without a configured domain, learn the public origin from CloudFront, which passes the viewer's
  // host as x-forwarded-host (see site.url). Only verified CloudFront requests are trusted for this.
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (!process.env.SITE_URL && fromCloudFront && forwardedHost) process.env.SITE_URL = `https://${forwardedHost}`;

  if (ADMIN_PATH.test(pathname)) {
    const result = await checkAdmin(request.headers.get("authorization"));
    if (result === "disabled") {
      return new NextResponse("The admin area is disabled. Set ADMIN_PASSWORD to enable it.", { status: 403 });
    }
    if (result !== "ok") {
      return new NextResponse("Authentication required", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Anitoy admin", charset="UTF-8"', "Cache-Control": "no-store" },
      });
    }
  }

  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/") || HAS_EXTENSION.test(pathname)) {
    return NextResponse.next();
  }

  // Locale-prefixed paths are served as they are. (/vi/... also answers, with canonical links to the
  // unprefixed URL; the standalone server runs the proxy again on its own rewrite, so this must not
  // redirect.)
  if (LOCALE_PREFIX.test(pathname)) return NextResponse.next();

  // Vietnamese is the default locale and lives at the root.
  const url = request.nextUrl.clone();
  url.pathname = `/vi${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|art/|favicon.ico).*)"],
};
