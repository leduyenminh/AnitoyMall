import { cache } from "react";
import { getRepository } from "./repo";
import type { TikTokVideo } from "./types";

// Request-scoped memoisation so a page and its metadata share one read.

export const getActiveProducts = cache(async () => {
  const products = await (await getRepository()).listProducts();
  return products.sort((a, b) => b.featured - a.featured || b.createdAt.localeCompare(a.createdAt));
});

export const getProductBySlug = cache(async (slug: string) => {
  const product = await (await getRepository()).getProductBySlug(slug);
  return product && product.status === "active" ? product : null;
});

/** All of the shop's TikTok videos keyed by id (covers + current view counts). */
export const getVideoMap = cache(async (): Promise<Map<string, TikTokVideo>> => {
  const videos = await (await getRepository()).listVideos();
  return new Map(videos.map((v) => [v.id, v]));
});

/** Campaigns and vouchers (live ones are picked at render time). */
export const getPromotions = cache(async () => (await getRepository()).listPromotions());
