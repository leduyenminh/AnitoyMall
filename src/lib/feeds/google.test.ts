import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Product, Sku } from "../types";
import { escapeXml, feedPrice, googleFeed, googleFeedItems } from "./google";

const sku = (overrides: Partial<Sku> & Pick<Sku, "id">): Sku => ({ name: "Tiêu chuẩn", price: 329000, stock: 5, ...overrides });

const product = (overrides: Partial<Product> & Pick<Product, "id" | "slug">): Product => ({
  title: "Mô hình Frieren 20cm",
  description: "Nhựa PVC.\n\nDecor bàn học.",
  images: ["/shop/products/1-1.webp", "/shop/products/1-2.webp"],
  collection: "frieren",
  category: "figure",
  tags: [],
  attributes: [],
  skus: [sku({ id: `${overrides.id}-1` })],
  tiktokVideoIds: [],
  featured: 0,
  status: "active",
  source: "tiktok",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const single = product({ id: "p-single", slug: "frieren-20cm" });
const withVariants = product({
  id: "p-trio",
  slug: "frieren-fern-stark",
  title: "Mô hình Frieren, Fern, Stark",
  i18n: { en: { title: "Frieren, Fern & Stark figures", skuNames: { "trio-fern": "Fern (EN)" } } },
  images: ["/shop/products/2-1.webp", "/shop/products/2-2.webp", "/shop/products/2-3.webp"],
  category: "mini",
  skus: [
    sku({ id: "trio-frieren", name: "Frieren", price: 79000, stock: 12, image: "/shop/products/2-3.webp" }),
    sku({ id: "trio-fern", name: "Fern", price: 79000, stock: 0 }),
  ],
});

beforeEach(() => vi.stubEnv("SITE_URL", "https://anitoy.example"));
afterEach(() => vi.unstubAllEnvs());

describe("Google feed items", () => {
  it("maps a single-SKU product to one item with the required fields", () => {
    const [item, ...rest] = googleFeedItems([single], "vi");
    expect(rest).toHaveLength(0);
    expect(item).toEqual({
      id: "p-single",
      title: "Mô hình Frieren 20cm",
      description: "Nhựa PVC.\n\nDecor bàn học.",
      link: "https://anitoy.example/products/frieren-20cm",
      imageLink: "https://anitoy.example/shop/products/1-1.webp",
      additionalImageLinks: ["https://anitoy.example/shop/products/1-2.webp"],
      availability: "in_stock",
      price: "329000 VND",
      condition: "new",
      brand: "Mall of Anitoy",
      identifierExists: "no",
      productType: "Figure 20cm > Frieren",
      // 329.000đ is above the free-shipping threshold.
      shipping: { country: "VN", price: "0 VND" },
    });
  });

  it("lists every variant as its own item in one group, linking to that variant", () => {
    const items = googleFeedItems([withVariants], "vi");
    expect(items.map((i) => i.id)).toEqual(["trio-frieren", "trio-fern"]);
    for (const item of items) expect(item.itemGroupId).toBe("p-trio");
    expect(items[0]).toMatchObject({
      title: "Mô hình Frieren, Fern, Stark - Frieren",
      pattern: "Frieren",
      link: "https://anitoy.example/products/frieren-fern-stark?sku=trio-frieren",
      // The variant's own photo leads, without repeating it among the extras.
      imageLink: "https://anitoy.example/shop/products/2-3.webp",
      additionalImageLinks: ["https://anitoy.example/shop/products/2-1.webp", "https://anitoy.example/shop/products/2-2.webp"],
      shipping: { country: "VN", price: "30000 VND" },
    });
  });

  it("keeps sold-out variants listed as out of stock", () => {
    const items = googleFeedItems([withVariants], "vi");
    expect(items.map((i) => i.availability)).toEqual(["in_stock", "out_of_stock"]);
  });

  it("uses the locale's text and URLs", () => {
    const fern = googleFeedItems([withVariants], "en")[1]!;
    expect(fern.title).toBe("Frieren, Fern & Stark figures - Fern (EN)");
    expect(fern.link).toBe("https://anitoy.example/en/products/frieren-fern-stark?sku=trio-fern");
    expect(fern.productType).toBe("Minis 9–12cm > Frieren");
  });

  it("sends a discounted SKU's reference price as price and the current one as sale price", () => {
    const discounted = product({ id: "p-sale", slug: "sale", skus: [sku({ id: "sale-1", price: 99000, compareAtPrice: 129000 })] });
    expect(googleFeedItems([discounted], "vi")[0]).toMatchObject({ price: "129000 VND", salePrice: "99000 VND" });
  });

  it("skips archived products and items Google would reject", () => {
    const archived = product({ id: "p-archived", slug: "archived", status: "archived" });
    const svgOnly = product({ id: "p-svg", slug: "svg", images: ["/art/placeholder.svg"] });
    const free = product({ id: "p-free", slug: "free", skus: [sku({ id: "free-1", price: 0 })] });
    expect(googleFeedItems([archived, svgOnly, free, single], "vi").map((i) => i.id)).toEqual(["p-single"]);
  });

  it("keeps titles within 150 characters without cutting off the variant", () => {
    const long = product({ ...withVariants, title: "Mô hình ".repeat(30) });
    const title = googleFeedItems([long], "vi")[0]!.title;
    expect([...title].length).toBeLessThanOrEqual(150);
    expect(title).toMatch(/… - Frieren$/);
  });
});

describe("feed prices", () => {
  it("formats amounts with the currency's decimals and ISO code", () => {
    expect(feedPrice(329000)).toBe("329000 VND");
    expect(feedPrice(0)).toBe("0 VND");
    expect(feedPrice(1299, "USD")).toBe("12.99 USD");
  });
});

describe("feed XML", () => {
  it("escapes markup characters and drops characters XML cannot hold", () => {
    expect(escapeXml(`Fern & Stark <3 "chibi" 'mini'`)).toBe("Fern &amp; Stark &lt;3 &quot;chibi&quot; &apos;mini&apos;");
    expect(escapeXml("a\u0000b\u0007c\u001Fd\uD800e￾f")).toBe("abcdef");
    expect(escapeXml("dòng 1\nđồng\ttab 🎀")).toBe("dòng 1\nđồng\ttab 🎀");
  });

  it("renders an RSS 2.0 document in the g: namespace", () => {
    const tricky = product({
      id: "p-<&>",
      slug: "tricky",
      title: `Frieren & Fern <Limited> "Edition"`,
      description: "Đẹp lắm </g:description><script>alert(1)</script>",
    });
    const xml = googleFeed([tricky, withVariants], "vi");
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">')).toBe(true);
    expect(xml).toContain("<title>Mall of Anitoy</title>");
    expect(xml).toContain("<link>https://anitoy.example/</link>");
    expect(xml).toContain("<g:id>p-&lt;&amp;&gt;</g:id>");
    expect(xml).toContain("<g:title>Frieren &amp; Fern &lt;Limited&gt; &quot;Edition&quot;</g:title>");
    expect(xml).toContain("<g:description>Đẹp lắm &lt;/g:description&gt;&lt;script&gt;alert(1)&lt;/script&gt;</g:description>");
    expect(xml).not.toContain("<script>");
    expect(xml).toContain("<g:item_group_id>p-trio</g:item_group_id>");
    expect(xml).toContain("<g:availability>out_of_stock</g:availability>");
    expect(xml).toContain("<g:shipping><g:country>VN</g:country><g:price>30000 VND</g:price></g:shipping>");
    expect(xml.match(/<item>/g)).toHaveLength(3);
    expect(xml.match(/<\/item>/g)).toHaveLength(3);
    expect(xml.trimEnd().endsWith("</channel>\n</rss>")).toBe(true);
  });
});
