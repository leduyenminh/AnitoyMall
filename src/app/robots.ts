import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export const revalidate = 3600;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin", "/en/admin", "/checkout", "/en/checkout", "/cart", "/en/cart", "/order/", "/en/order/"],
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
