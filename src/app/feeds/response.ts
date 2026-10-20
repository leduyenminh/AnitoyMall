import { getActiveProducts } from "@/lib/data";
import { googleFeed } from "@/lib/feeds/google";
import type { Locale } from "@/lib/types";

/** The Merchant Center feed for one locale, built from the live catalog. */
export async function googleFeedResponse(locale: Locale): Promise<Response> {
  const xml = googleFeed(await getActiveProducts(), locale);
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
