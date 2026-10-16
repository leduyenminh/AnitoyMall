import path from "node:path";
import type { NextConfig } from "next";

/** Hostname of the public site, so next/image can optimise mirrored media served from our own CDN. */
function siteHostname(): string | undefined {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "").hostname || undefined;
  } catch {
    return undefined;
  }
}

const siteHost = siteHostname();

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Self-contained server bundle: runs unchanged in Docker, on ECS, or on Lambda via the Lambda Web Adapter.
  output: "standalone",
  poweredByHeader: false,
  // In-memory ISR cache: Lambda's filesystem is read-only, and CloudFront is the shared cache in front of it.
  cacheHandler: path.join(process.cwd(), "cache-handler.mjs"),
  cacheMaxMemorySize: 0,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // TikTok Shop product image CDNs (used before images are mirrored to S3).
      { protocol: "https", hostname: "**.ibyteimg.com" },
      { protocol: "https", hostname: "**.byteimg.com" },
      { protocol: "https", hostname: "**.tiktokcdn.com" },
      { protocol: "https", hostname: "**.tiktokcdn-us.com" },
      { protocol: "https", hostname: "**.tiktokcdn-eu.com" },
      // Product media mirrored to S3 and served through our CloudFront distribution.
      { protocol: "https", hostname: "**.cloudfront.net", pathname: "/media/**" },
      ...(siteHost ? [{ protocol: "https" as const, hostname: siteHost, pathname: "/media/**" }] : []),
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
