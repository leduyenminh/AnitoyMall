import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { seedProducts } from "@/data/seed-products";
import { seedVideos } from "@/data/tiktok-videos";
import { mergeVideo } from "./tiktok/display";
import { formatViews, productVideos, tiktokPlayerUrl, totalViews } from "./videos";

const publicFile = (url: string) => path.join(import.meta.dirname, "..", "..", "public", url);

describe("video helpers", () => {
  it("formats counts the way TikTok shows them", () => {
    expect(formatViews(530)).toBe("530");
    expect(formatViews(128100)).toBe("128.1K");
    expect(formatViews(1_234_567)).toBe("1.2M");
  });

  it("orders a product's videos by views and sums them", () => {
    const map = new Map(seedVideos.map((v) => [v.id, v]));
    const frieren = seedProducts.find((p) => p.id === "seed-frieren-20cm")!;
    const videos = productVideos(frieren, map);
    expect(videos[0]?.views).toBe(493000);
    expect(videos.map((v) => v.views)).toEqual([...videos.map((v) => v.views)].sort((a, b) => b - a));
    expect(totalViews(videos)).toBeGreaterThan(700_000);
  });

  it("uses TikTok's official player", () => {
    expect(tiktokPlayerUrl("123")).toMatch(/^https:\/\/www\.tiktok\.com\/player\/v1\/123\?autoplay=1/);
  });
});

describe("seed catalog", () => {
  const videoIds = new Set(seedVideos.map((v) => v.id));

  it("only links videos the shop actually posted", () => {
    for (const product of seedProducts) {
      expect(product.tiktokVideoIds.length, product.id).toBeGreaterThan(0);
      for (const id of product.tiktokVideoIds) expect(videoIds.has(id), `${product.id} → ${id}`).toBe(true);
    }
  });

  it("uses the shop's own photos, all present on disk", () => {
    for (const product of seedProducts) {
      const images = [...product.images, ...product.skus.flatMap((s) => (s.image ? [s.image] : []))];
      for (const image of images) {
        // Listing photos from TikTok Shop, or square crops of the shop's own video covers.
        expect(image, product.id).toMatch(/^\/shop\/(products\/\d+-\d+|videos\/\d+-square)\.webp$/);
        expect(existsSync(publicFile(image)), image).toBe(true);
      }
    }
    for (const video of seedVideos) expect(existsSync(publicFile(video.cover)), video.cover).toBe(true);
  });

  it("keeps sold-out products in the catalog", () => {
    const soldOut = seedProducts.filter((p) => p.skus.every((s) => s.stock === 0));
    expect(soldOut.length).toBeGreaterThan(0);
    expect(soldOut.every((p) => p.status === "active")).toBe(true);
  });
});

describe("Display API merge", () => {
  it("updates counts but keeps our stored cover and caption", async () => {
    const existing = seedVideos[0]!;
    const merged = await mergeVideo(existing, { id: existing.id, view_count: 250_000, like_count: 9000, title: "new" }, "2026-11-01T00:00:00.000Z");
    expect(merged).toMatchObject({ id: existing.id, views: 250_000, likes: 9000, cover: existing.cover, title: existing.title });
  });

  it("creates new videos from the API (cover URL used as-is without a media bucket)", async () => {
    const merged = await mergeVideo(
      undefined,
      { id: "999", title: "Hello", cover_image_url: "https://p16.tiktokcdn.com/x.jpg", view_count: 10, create_time: 1_800_000_000 },
      "2026-11-01T00:00:00.000Z",
    );
    expect(merged).toMatchObject({ id: "999", title: "Hello", views: 10, cover: "https://p16.tiktokcdn.com/x.jpg" });
    expect(merged.createdAt).toBe(new Date(1_800_000_000_000).toISOString());
  });
});
