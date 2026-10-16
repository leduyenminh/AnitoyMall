import { describe, expect, it } from "vitest";
import type { Product } from "../types";
import { buildQuote, MAX_QTY_PER_LINE, shippingFor } from "./quote";

const product = (id: string, skus: Product["skus"], status: Product["status"] = "active"): Product => ({
  id,
  slug: id,
  title: `Title ${id}`,
  description: "",
  images: [`/art/${id}.svg`],
  collection: "frieren",
  category: "mini",
  tags: [],
  attributes: [],
  skus,
  tiktokVideoIds: [],
  featured: 0,
  status,
  source: "seed",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const catalog = [
  product("a", [{ id: "a1", name: "Std", price: 79000, stock: 5 }]),
  product("b", [{ id: "b1", name: "Std", price: 50000, stock: 0 }]),
  product("c", [{ id: "c1", name: "Std", price: 20000, stock: 100 }], "archived"),
];

describe("shippingFor", () => {
  it("charges the flat fee below the threshold and nothing above it", () => {
    expect(shippingFor(0)).toBe(0);
    expect(shippingFor(79000)).toBe(30000);
    expect(shippingFor(150000)).toBe(0);
  });
});

describe("buildQuote", () => {
  it("prices from the catalog, never from the client", () => {
    const q = buildQuote([{ productId: "a", skuId: "a1", quantity: 1, price: 1 }], catalog, "vi");
    expect(q.lines[0]).toMatchObject({ unitPrice: 79000, lineTotal: 79000, issue: "price_changed" });
    expect(q.total).toBe(79000 + 30000);
  });

  it("merges duplicate lines and caps quantity at available stock", () => {
    const q = buildQuote(
      [
        { productId: "a", skuId: "a1", quantity: 4 },
        { productId: "a", skuId: "a1", quantity: 4 },
      ],
      catalog,
      "en",
    );
    expect(q.lines).toHaveLength(1);
    expect(q.lines[0]).toMatchObject({ requested: 8, quantity: 5, issue: "insufficient_stock" });
    expect(q.subtotal).toBe(5 * 79000);
    expect(q.shippingFee).toBe(0);
    expect(q.freeShippingRemaining).toBe(0);
  });

  it("flags sold-out, archived and unknown items and excludes them from totals", () => {
    const q = buildQuote(
      [
        { productId: "b", skuId: "b1", quantity: 1 },
        { productId: "c", skuId: "c1", quantity: 1 },
        { productId: "zzz", skuId: "x", quantity: 1 },
      ],
      catalog,
      "vi",
    );
    expect(q.lines.map((l) => l.issue)).toEqual(["unavailable", "unavailable", "unavailable"]);
    expect(q.total).toBe(0);
    expect(q.hasIssues).toBe(true);
  });

  it("enforces the per-line purchase limit", () => {
    const big = [product("d", [{ id: "d1", name: "Std", price: 1000, stock: 500 }])];
    const q = buildQuote([{ productId: "d", skuId: "d1", quantity: 99 }], big, "vi");
    expect(q.lines[0]?.quantity).toBe(MAX_QTY_PER_LINE);
  });

  it("ignores non-positive quantities", () => {
    const q = buildQuote([{ productId: "a", skuId: "a1", quantity: 0 }], catalog, "vi");
    expect(q.lines).toHaveLength(0);
    expect(q.itemCount).toBe(0);
  });
});
