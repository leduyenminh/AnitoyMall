import { slugify } from "../catalog";
import { toMinorUnits } from "../money";
import { site } from "../site";
import type { Product, Sku } from "../types";
import type { TtsProductDetail } from "./types";

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/**
 * TikTok descriptions are HTML written by the seller. Rather than trusting third-party markup,
 * reduce it to plain text paragraphs; the storefront renders text only.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*li[^>]*>/gi, "\n• ")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*\/\s*(p|div|h[1-6]|ul|ol)\s*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (match, entity: string) => {
      if (entity.startsWith("#")) {
        const code = entity[1]?.toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      return ENTITIES[entity.toLowerCase()] ?? match;
    })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Best-effort merchandising for new listings; adjust collection/category later as needed. */
export function inferCollection(title: string): string {
  const t = slugify(title);
  if (/(frieren|fern|stark|himmel)/.test(t)) return "frieren";
  if (/(neko|meo|kinako|osakana|cat)/.test(t)) return "neko";
  return "other";
}

export function inferCategory(title: string): string {
  const t = slugify(title);
  if (/(combo|bo-3|bo-2|set|bundle)/.test(t)) return "set";
  if (/(15-?cm|20-?cm|25-?cm|30-?cm)/.test(t)) return "figure";
  return "mini";
}

function mapSku(sku: NonNullable<TtsProductDetail["skus"]>[number], fallbackName: string): Sku {
  const name =
    (sku.sales_attributes ?? [])
      .map((a) => a.value_name)
      .filter(Boolean)
      .join(" / ") || fallbackName;
  const currency = sku.price?.currency ?? site.currency;
  const price = toMinorUnits(sku.price?.sale_price ?? sku.price?.tax_exclusive_price ?? "0", currency);
  const inventory = sku.inventory ?? [];
  return {
    id: `tt-${sku.id}`,
    name,
    price,
    stock: inventory.reduce((sum, i) => sum + (i.quantity ?? 0), 0),
    sellerSku: sku.seller_sku,
    tiktokSkuId: sku.id,
    tiktokWarehouseId: inventory[0]?.warehouse_id,
  };
}

/**
 * Map a TikTok Shop listing onto a storefront product. Fields the seller curates on the website
 * (slug, translations, videos, merchandising) are preserved from the existing record.
 */
export function mapTikTokProduct(
  detail: TtsProductDetail,
  existing: Product | undefined,
  images: string[],
  now = new Date().toISOString(),
): Product {
  const skus = (detail.skus ?? []).map((sku) => mapSku(sku, "Tiêu chuẩn"));

  const attributes = (detail.product_attributes ?? [])
    .map((a) => ({ name: a.name ?? "", value: (a.values ?? []).map((v) => v.name).filter(Boolean).join(", ") }))
    .filter((a) => a.name && a.value);

  return {
    id: existing?.id ?? `tt-${detail.id}`,
    slug: existing?.slug ?? `${slugify(detail.title)}-${detail.id.slice(-4)}`,
    title: detail.title,
    description: htmlToText(detail.description ?? ""),
    i18n: existing?.i18n,
    images: images.length ? images : (existing?.images ?? []),
    collection: existing?.collection ?? inferCollection(detail.title),
    category: existing?.category ?? inferCategory(detail.title),
    tags: existing?.tags ?? [],
    attributes,
    skus,
    tiktokProductId: detail.id,
    tiktokVideoIds: existing?.tiktokVideoIds ?? [],
    featured: existing?.featured ?? 0,
    status: !detail.status || detail.status === "ACTIVATE" ? "active" : "archived",
    source: "tiktok",
    rating: existing?.rating,
    createdAt: existing?.createdAt ?? (detail.create_time ? new Date(detail.create_time * 1000).toISOString() : now),
    updatedAt: now,
  };
}

/** True when the parts of a product that shoppers see differ (ignores timestamps). */
export function productChanged(a: Product | undefined, b: Product): boolean {
  if (!a) return true;
  const strip = ({ updatedAt: _u, ...rest }: Product) => rest;
  return JSON.stringify(strip(a)) !== JSON.stringify(strip(b));
}
