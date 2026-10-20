import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { seedProducts } from "@/data/seed-products";
import { googleFeedItems } from "./feeds/google";
import { productJsonLd } from "./structured-data";

type Node = Record<string, unknown>;

const singleSku = seedProducts.find((p) => p.skus.length === 1)!;
const variants = seedProducts.find((p) => p.skus.length > 1 && p.skus.some((s) => s.stock > 0))!;

beforeEach(() => vi.stubEnv("SITE_URL", "https://anitoy.example"));
afterEach(() => vi.unstubAllEnvs());

describe("product structured data", () => {
  it("gives a single-SKU product one Offer with Google's merchant-listing fields", () => {
    const data = productJsonLd(singleSku, "vi");
    expect(data["@type"]).toBe("Product");
    const offer = data.offers as Node;
    expect(offer).toMatchObject({
      "@type": "Offer",
      price: singleSku.skus[0]!.price,
      priceCurrency: "VND",
      itemCondition: "https://schema.org/NewCondition",
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: { addressCountry: "VN" },
        deliveryTime: { transitTime: { minValue: 2, maxValue: 5, unitCode: "DAY" } },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "VN",
        returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
      },
    });
    expect(offer.availability).toMatch(/^https:\/\/schema\.org\/(InStock|OutOfStock)$/);
  });

  it("describes variants as a ProductGroup whose offers match the feed items", () => {
    const data = productJsonLd(variants, "vi");
    expect(data).toMatchObject({ "@type": "ProductGroup", productGroupID: variants.id, variesBy: ["https://schema.org/pattern"] });
    const feed = googleFeedItems([variants], "vi");
    const offers = (data.hasVariant as Node[]).map((v) => ({ sku: v.sku, offer: v.offers as Node }));
    expect(offers.map((o) => o.sku)).toEqual(feed.map((i) => i.id));
    offers.forEach(({ offer }, i) => {
      expect(offer.url).toBe(feed[i]!.link);
      expect(offer.availability).toBe(feed[i]!.availability === "in_stock" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock");
      expect(`${offer.price} VND`).toBe(feed[i]!.salePrice ?? feed[i]!.price);
    });
  });

  it("advertises a return window once one is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_RETURN_DAYS", "7");
    vi.resetModules();
    const { productJsonLd: withReturns } = await import("./structured-data");
    const offer = withReturns(singleSku, "vi").offers as Node;
    expect(offer.hasMerchantReturnPolicy).toMatchObject({
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 7,
      refundType: "https://schema.org/ExchangeRefund",
    });
  });
});
