import { localePath } from "@/i18n/config";
import { shippingFor } from "./checkout/quote";
import { site } from "./site";
import type { Locale, Product, Sku } from "./types";

// Facts Google needs about selling a product here, shared by the Merchant Center feed and the
// product pages' structured data so the two always agree (Google disapproves items whose feed price,
// availability or shipping differ from the landing page).

export const MERCHANT_COUNTRY = "VN";

/** Absolute URL for a site path; media already hosted elsewhere is returned as is. */
export function absoluteUrl(src: string): string {
  return /^https?:\/\//i.test(src) ? src : `${site.url}${src.startsWith("/") ? "" : "/"}${src}`;
}

/** A product sold in several variants gets one feed item and one offer per SKU. */
export function hasVariants(product: Product): boolean {
  return product.skus.length > 1;
}

/** The product page; a variant's link adds `?sku=` so the page opens with that variant selected. */
export function productUrl(product: Product, locale: Locale, sku?: Sku): string {
  const url = `${site.url}${localePath(locale, `/products/${product.slug}`)}`;
  return sku ? `${url}?sku=${encodeURIComponent(sku.id)}` : url;
}

/** Id shared by the feed item and the structured-data `sku`, so Google can pair them. */
export function merchantItemId(product: Product, sku: Sku): string {
  return hasVariants(product) ? sku.id : product.id;
}

/** Absolute photo URLs Google accepts (no SVG), the SKU's own photo first. */
export function merchantImages(product: Product, sku?: Sku): string[] {
  const sources = [...(sku?.image ? [sku.image] : []), ...product.images].filter((src) => !/\.svg(?:[?#]|$)/i.test(src));
  return [...new Set(sources.map(absoluteUrl))];
}

/** Shipping for one unit bought on its own, as checkout would charge it. */
export function shippingFeeFor(sku: Sku): number {
  return shippingFor(sku.price);
}

/** The delivery window quoted on product pages ("2–5" days) as numbers. */
export function deliveryDays(eta: string = site.shipping.etaDays): { min: number; max: number } | undefined {
  const days = eta.match(/\d+/g)?.map(Number) ?? [];
  return days.length ? { min: Math.min(...days), max: Math.max(...days) } : undefined;
}
