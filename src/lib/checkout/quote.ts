import { productTitle, skuName } from "../catalog";
import { applyVoucher, promoTitle, type VoucherIssue } from "../promotions";
import { site } from "../site";
import type { CartItemInput, Locale, Product, Promotion } from "../types";

/** Per-line purchase limit; protects stock from a single runaway cart. */
export const MAX_QTY_PER_LINE = 20;

export type QuoteIssue = "unavailable" | "insufficient_stock" | "price_changed";

export interface QuoteLine {
  productId: string;
  skuId: string;
  slug: string;
  title: string;
  skuName: string;
  image?: string;
  unitPrice: number;
  requested: number;
  quantity: number;
  lineTotal: number;
  available: number;
  tiktokProductId?: string;
  tiktokSkuId?: string;
  issue?: QuoteIssue;
}

export interface Quote {
  currency: string;
  lines: QuoteLine[];
  itemCount: number;
  subtotal: number;
  /** Voucher discount on the merchandise subtotal. */
  discount: number;
  /** The website voucher that was applied (or rejected, see voucherIssue). */
  voucher?: { code: string; title: string; minSpend?: number };
  voucherIssue?: VoucherIssue;
  shippingFee: number;
  total: number;
  /** Amount still needed to unlock free shipping (0 once reached). */
  freeShippingRemaining: number;
  /** True when any line was adjusted (stock, availability or price) and the shopper should review. */
  hasIssues: boolean;
}

export function shippingFor(subtotal: number): number {
  if (subtotal <= 0 || subtotal >= site.shipping.freeThreshold) return 0;
  return site.shipping.flatFee;
}

/** Merge duplicate product/SKU entries and drop non-positive quantities. */
export function normaliseItems(items: (CartItemInput & { price?: number })[]) {
  const merged = new Map<string, CartItemInput & { price?: number }>();
  for (const item of items) {
    const quantity = Math.floor(item.quantity);
    if (!(quantity > 0)) continue;
    const key = `${item.productId}::${item.skuId}`;
    const current = merged.get(key);
    merged.set(key, current ? { ...current, quantity: current.quantity + quantity } : { ...item, quantity });
  }
  return [...merged.values()];
}

/**
 * Price a cart against the authoritative catalog. Prices and stock from the client are never
 * trusted: `price` on an item is only used to tell the shopper that a price changed.
 */
export function buildQuote(
  items: (CartItemInput & { price?: number })[],
  products: Product[],
  locale: Locale,
  options: { voucherCode?: string; promotions?: Promotion[]; now?: Date } = {},
): Quote {
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: QuoteLine[] = normaliseItems(items).map((item) => {
    const product = byId.get(item.productId);
    const sku = product?.skus.find((s) => s.id === item.skuId);
    if (!product || !sku || product.status !== "active") {
      return {
        productId: item.productId,
        skuId: item.skuId,
        slug: product?.slug ?? "",
        title: product ? productTitle(product, locale) : "",
        skuName: product && sku ? skuName(product, sku, locale) : "",
        image: sku?.image ?? product?.images[0],
        unitPrice: sku?.price ?? item.price ?? 0,
        requested: item.quantity,
        quantity: 0,
        lineTotal: 0,
        available: 0,
        issue: "unavailable",
      };
    }
    const available = Math.max(0, sku.stock);
    const wanted = Math.min(item.quantity, MAX_QTY_PER_LINE);
    const quantity = Math.min(wanted, available);
    let issue: QuoteIssue | undefined;
    if (available === 0) issue = "unavailable";
    else if (quantity < item.quantity) issue = "insufficient_stock";
    else if (item.price !== undefined && item.price !== sku.price) issue = "price_changed";
    return {
      productId: product.id,
      skuId: sku.id,
      slug: product.slug,
      title: productTitle(product, locale),
      skuName: skuName(product, sku, locale),
      image: sku.image ?? product.images[0],
      unitPrice: sku.price,
      requested: item.quantity,
      quantity,
      lineTotal: sku.price * quantity,
      available,
      tiktokProductId: product.tiktokProductId,
      tiktokSkuId: sku.tiktokSkuId,
      issue,
    };
  });

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  // Free shipping is earned on the merchandise subtotal, before any voucher.
  const shippingFee = shippingFor(subtotal);
  const applied = options.voucherCode
    ? applyVoucher(options.voucherCode, options.promotions ?? [], subtotal, options.now)
    : undefined;
  const discount = applied?.discount ?? 0;
  return {
    currency: site.currency,
    lines,
    itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
    subtotal,
    discount,
    ...(applied?.voucher
      ? { voucher: { code: applied.voucher.code!, title: promoTitle(applied.voucher, locale), minSpend: applied.voucher.minSpend } }
      : {}),
    ...(applied?.issue ? { voucherIssue: applied.issue } : {}),
    shippingFee,
    total: subtotal - discount + shippingFee,
    freeShippingRemaining: subtotal > 0 ? Math.max(0, site.shipping.freeThreshold - subtotal) : site.shipping.freeThreshold,
    hasIssues: lines.some((l) => l.issue),
  };
}
