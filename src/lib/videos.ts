import type { Product, TikTokVideo } from "./types";

/** "128.1K" – the format TikTok itself shows, in both languages. */
export function formatViews(views: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(views);
}

/** The product's videos that we know about, most viewed first. */
export function productVideos(product: Product, videos: Map<string, TikTokVideo>): TikTokVideo[] {
  return product.tiktokVideoIds
    .map((id) => videos.get(id))
    .filter((v): v is TikTokVideo => Boolean(v))
    .sort((a, b) => b.views - a.views);
}

export function totalViews(videos: TikTokVideo[]): number {
  return videos.reduce((sum, v) => sum + v.views, 0);
}

/** TikTok's official embed player. Plays happen on TikTok's player, not a copy of the video. */
export function tiktokPlayerUrl(videoId: string, { autoplay = true } = {}): string {
  const params = new URLSearchParams({
    autoplay: autoplay ? "1" : "0",
    // Related videos come from the same account, keeping viewers on the shop's own videos.
    rel: "0",
  });
  return `https://www.tiktok.com/player/v1/${videoId}?${params}`;
}

/** Plain, serialisable shape handed to client components. */
export interface VideoCard {
  id: string;
  title: string;
  cover: string;
  views: number;
}

export const toVideoCard = ({ id, title, cover, views }: TikTokVideo): VideoCard => ({ id, title, cover, views });
