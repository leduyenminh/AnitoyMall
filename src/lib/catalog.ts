import type { Locale, Product, ProductAttribute, Sku } from "./types";

// `cover` is a video id whose cover represents the collection.
export const collections = [
  { slug: "frieren", name: { vi: "Frieren", en: "Frieren" }, accent: "#3fa877", cover: "7627760395935091989" },
  { slug: "neko", name: { vi: "Neko Kawaii", en: "Neko Kawaii" }, accent: "#e9a95c", cover: "7621236910488440071" },
  { slug: "kimetsu", name: { vi: "Kimetsu no Yaiba", en: "Demon Slayer" }, accent: "#d9432f", cover: "7499143655727336722" },
  { slug: "more", name: { vi: "Anime & game khác", en: "More anime & games" }, accent: "#7d52b8", cover: "7484071785730772229" },
] as const;

export const categories = [
  { slug: "mini", name: { vi: "Mini 9–12cm", en: "Minis 9–12cm" } },
  { slug: "figure", name: { vi: "Figure 20cm", en: "Figures 20cm" } },
  { slug: "set", name: { vi: "Combo tiết kiệm", en: "Value sets" } },
  { slug: "accessory", name: { vi: "Móc khoá & phụ kiện", en: "Keychains & accessories" } },
] as const;

export function collectionName(slug: string, locale: Locale): string {
  return collections.find((c) => c.slug === slug)?.name[locale] ?? slug;
}

export function categoryName(slug: string, locale: Locale): string {
  return categories.find((c) => c.slug === slug)?.name[locale] ?? slug;
}

export function productTitle(p: Product, locale: Locale): string {
  return p.i18n?.[locale]?.title ?? p.title;
}

export function productDescription(p: Product, locale: Locale): string {
  return p.i18n?.[locale]?.description ?? p.description;
}

export function productAttributes(p: Product, locale: Locale): ProductAttribute[] {
  return p.i18n?.[locale]?.attributes ?? p.attributes;
}

export function skuName(p: Product, sku: Sku, locale: Locale): string {
  return p.i18n?.[locale]?.skuNames?.[sku.id] ?? sku.name;
}

export function totalStock(p: Product): number {
  return p.skus.reduce((sum, s) => sum + Math.max(0, s.stock), 0);
}

export function isInStock(p: Product): boolean {
  return totalStock(p) > 0;
}

/** Lowest price among purchasable SKUs (falls back to all SKUs when none are in stock). */
export function priceRange(p: Product): { min: number; max: number; compareAt?: number } {
  const pool = p.skus.some((s) => s.stock > 0) ? p.skus.filter((s) => s.stock > 0) : p.skus;
  const prices = pool.map((s) => s.price);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const cheapest = pool.find((s) => s.price === min);
  return { min, max, compareAt: cheapest?.compareAtPrice };
}

export function defaultSku(p: Product): Sku | undefined {
  return p.skus.find((s) => s.stock > 0) ?? p.skus[0];
}

/** Products that share a collection or category, best merchandised first. */
export function relatedProducts(all: Product[], p: Product, limit = 4): Product[] {
  return all
    .filter((o) => o.id !== p.id && o.status === "active")
    .map((o) => ({
      o,
      score: (o.collection === p.collection ? 2 : 0) + (o.category === p.category ? 1 : 0) + (isInStock(o) ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || b.o.featured - a.o.featured)
    .slice(0, limit)
    .map(({ o }) => o);
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Accent-insensitive text used for client-side search. */
export function searchText(p: Product): string {
  return slugify(
    [p.title, p.i18n?.en?.title ?? "", p.tags.join(" "), p.collection, p.category].join(" "),
  ).replace(/-/g, " ");
}
