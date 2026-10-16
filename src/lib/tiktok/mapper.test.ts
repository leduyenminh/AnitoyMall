import { describe, expect, it } from "vitest";
import type { Product } from "../types";
import { htmlToText, inferCategory, inferCollection, mapTikTokProduct, productChanged } from "./mapper";
import type { TtsProductDetail } from "./types";

const detail: TtsProductDetail = {
  id: "1729384756",
  title: "Mô hình Frieren 20cm ôm hoa",
  description: "<p>Figure <strong>cao 20cm</strong></p><ul><li>PVC</li><li>Có đế</li></ul><script>alert(1)</script>",
  status: "ACTIVATE",
  skus: [
    {
      id: "555",
      seller_sku: "FR-20",
      price: { currency: "VND", sale_price: "329000" },
      inventory: [
        { warehouse_id: "w1", quantity: 3 },
        { warehouse_id: "w2", quantity: 2 },
      ],
      sales_attributes: [{ name: "Màu", value_name: "Trắng" }],
    },
  ],
  product_attributes: [{ name: "Chất liệu", values: [{ name: "PVC" }] }],
  create_time: 1_700_000_000,
};

describe("htmlToText", () => {
  it("keeps text structure and drops markup and scripts", () => {
    const text = htmlToText(detail.description!);
    expect(text).toContain("Figure cao 20cm");
    expect(text).toContain("• PVC");
    expect(text).not.toContain("<");
    expect(text).not.toContain("alert");
  });

  it("decodes entities", () => {
    expect(htmlToText("Tom &amp; Jerry &#39;x&#39; &#x41;")).toBe("Tom & Jerry 'x' A");
  });
});

describe("inference", () => {
  it("guesses collection and category from the title", () => {
    expect(inferCollection("Mô hình Fern mini")).toBe("frieren");
    expect(inferCollection("Neko mặc áo trùm")).toBe("neko");
    expect(inferCategory("Combo 3 thầy trò")).toBe("set");
    expect(inferCategory("Frieren 20cm")).toBe("figure");
    expect(inferCategory("Fern cute 10cm")).toBe("mini");
  });
});

describe("mapTikTokProduct", () => {
  it("maps a new listing", () => {
    const p = mapTikTokProduct(detail, undefined, ["https://cdn.example/1.jpg"], "2026-10-16T00:00:00.000Z");
    expect(p).toMatchObject({
      id: "tt-1729384756",
      tiktokProductId: "1729384756",
      collection: "frieren",
      category: "figure",
      status: "active",
      source: "tiktok",
      images: ["https://cdn.example/1.jpg"],
      attributes: [{ name: "Chất liệu", value: "PVC" }],
    });
    expect(p.slug).toMatch(/^mo-hinh-frieren-20cm-om-hoa-4756$/);
    expect(p.skus[0]).toMatchObject({ id: "tt-555", name: "Trắng", price: 329000, stock: 5, tiktokSkuId: "555", tiktokWarehouseId: "w1" });
  });

  it("preserves storefront curation on existing products", () => {
    const existing = {
      ...mapTikTokProduct(detail, undefined, []),
      slug: "custom-slug",
      featured: 99,
      tiktokVideoIds: ["v1"],
      collection: "neko",
      i18n: { en: { title: "Frieren with flowers" } },
    } as Product;
    const p = mapTikTokProduct({ ...detail, status: "SELLER_DEACTIVATED" }, existing, []);
    expect(p).toMatchObject({ slug: "custom-slug", featured: 99, tiktokVideoIds: ["v1"], collection: "neko", status: "archived" });
    expect(p.i18n?.en?.title).toBe("Frieren with flowers");
  });

  it("detects meaningful changes only", () => {
    const a = mapTikTokProduct(detail, undefined, [], "2026-01-01T00:00:00.000Z");
    const b = mapTikTokProduct(detail, a, [], "2026-02-01T00:00:00.000Z");
    expect(productChanged(a, b)).toBe(false);
    const c = mapTikTokProduct({ ...detail, skus: [{ ...detail.skus![0]!, inventory: [{ warehouse_id: "w1", quantity: 0 }] }] }, a, []);
    expect(productChanged(a, c)).toBe(true);
  });
});
