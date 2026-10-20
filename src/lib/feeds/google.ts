import { getDictionary } from "@/i18n";
import { localePath } from "@/i18n/config";
import { categoryName, collectionName, productDescription, productTitle, skuName } from "../catalog";
import { hasVariants, MERCHANT_COUNTRY, merchantImages, merchantItemId, productUrl, shippingFeeFor } from "../merchant";
import { currencyExponent, fromMinorUnits } from "../money";
import { site } from "../site";
import type { Locale, Product, Sku } from "../types";

// Google Merchant Center product feed: RSS 2.0 with the g: namespace, one feed per locale.
// Attribute reference: https://support.google.com/merchants/answer/7052112

export const googleFeedPaths: Record<Locale, string> = { vi: "/feeds/google.xml", en: "/feeds/google-en.xml" };

const TITLE_MAX = 150;
const DESCRIPTION_MAX = 5000;
const PATTERN_MAX = 100;
const ADDITIONAL_IMAGES_MAX = 10;

export interface GoogleFeedItem {
  id: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  additionalImageLinks: string[];
  availability: "in_stock" | "out_of_stock";
  /** Regular price; `salePrice` holds the current one when the SKU is discounted. */
  price: string;
  salePrice?: string;
  condition: "new";
  brand: string;
  identifierExists: "no";
  itemGroupId?: string;
  /** What tells variants apart (the character or design on our figures). */
  pattern?: string;
  productType: string;
  shipping: { country: string; price: string };
}

/** "329000 VND": the amount with the currency's usual decimals, then its ISO code. */
export function feedPrice(minor: number, currency: string = site.currency): string {
  return `${fromMinorUnits(minor, currency).toFixed(currencyExponent(currency))} ${currency}`;
}

function truncate(text: string, max: number): string {
  const chars = [...text];
  return chars.length <= max ? text : `${chars.slice(0, Math.max(0, max - 1)).join("").trimEnd()}…`;
}

function feedItem(product: Product, sku: Sku, locale: Locale): GoogleFeedItem | undefined {
  const [imageLink, ...moreImages] = merchantImages(product, sku);
  // Google rejects items without a photo or a price.
  if (!imageLink || sku.price <= 0) return undefined;

  const variant = hasVariants(product) ? truncate(skuName(product, sku, locale), PATTERN_MAX) : undefined;
  const suffix = variant ? ` - ${variant}` : "";
  const title = truncate(productTitle(product, locale), TITLE_MAX - [...suffix].length) + suffix;
  const onSale = sku.compareAtPrice !== undefined && sku.compareAtPrice > sku.price;

  return {
    id: merchantItemId(product, sku),
    title,
    description: truncate(productDescription(product, locale).trim() || title, DESCRIPTION_MAX),
    link: productUrl(product, locale, variant ? sku : undefined),
    imageLink,
    additionalImageLinks: moreImages.slice(0, ADDITIONAL_IMAGES_MAX),
    availability: sku.stock > 0 ? "in_stock" : "out_of_stock",
    price: feedPrice(onSale ? sku.compareAtPrice! : sku.price),
    ...(onSale ? { salePrice: feedPrice(sku.price) } : {}),
    condition: "new",
    brand: site.name,
    identifierExists: "no",
    ...(variant ? { itemGroupId: product.id, pattern: variant } : {}),
    productType: `${categoryName(product.category, locale)} > ${collectionName(product.collection, locale)}`,
    shipping: { country: MERCHANT_COUNTRY, price: feedPrice(shippingFeeFor(sku)) },
  };
}

/** One item per SKU; a product's variants share an item group. Sold-out SKUs stay listed. */
export function googleFeedItems(products: Product[], locale: Locale): GoogleFeedItem[] {
  return products
    .filter((p) => p.status === "active")
    .flatMap((p) => p.skus.map((sku) => feedItem(p, sku, locale)))
    .filter((item) => item !== undefined);
}

// Characters XML 1.0 cannot carry at all (control codes, lone surrogates); they are dropped.
const INVALID_XML_CHARS = /[^\t\n\r -퟿-�\u{10000}-\u{10FFFF}]/gu;
const XML_ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };

export function escapeXml(text: string): string {
  return text.replace(INVALID_XML_CHARS, "").replace(/[&<>"']/g, (c) => XML_ENTITIES[c]!);
}

const field = (name: string, value: string) => `<g:${name}>${escapeXml(value)}</g:${name}>`;

function renderItem(item: GoogleFeedItem): string {
  const fields: [string, string | undefined][] = [
    ["id", item.id],
    ["item_group_id", item.itemGroupId],
    ["title", item.title],
    ["description", item.description],
    ["link", item.link],
    ["image_link", item.imageLink],
    ...item.additionalImageLinks.map((src): [string, string] => ["additional_image_link", src]),
    ["availability", item.availability],
    ["price", item.price],
    ["sale_price", item.salePrice],
    ["condition", item.condition],
    ["brand", item.brand],
    ["identifier_exists", item.identifierExists],
    ["pattern", item.pattern],
    ["product_type", item.productType],
  ];
  const lines = fields.flatMap(([name, value]) => (value === undefined ? [] : [`  ${field(name, value)}`]));
  const shipping = `<g:shipping>${field("country", item.shipping.country)}${field("price", item.shipping.price)}</g:shipping>`;
  return ["<item>", ...lines, `  ${shipping}`, "</item>"].join("\n");
}

export function renderGoogleFeed(items: GoogleFeedItem[], channel: { title: string; link: string; description: string }): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "<channel>",
    `<title>${escapeXml(channel.title)}</title>`,
    `<link>${escapeXml(channel.link)}</link>`,
    `<description>${escapeXml(channel.description)}</description>`,
    ...items.map(renderItem),
    "</channel>",
    "</rss>",
    "",
  ].join("\n");
}

/** The whole feed document for one locale. */
export function googleFeed(products: Product[], locale: Locale): string {
  return renderGoogleFeed(googleFeedItems(products, locale), {
    title: site.name,
    link: `${site.url}${localePath(locale, "/")}`,
    description: getDictionary(locale).meta.title,
  });
}
