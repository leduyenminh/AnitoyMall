import { describe, expect, it } from "vitest";
import { buildQuote } from "./checkout/quote";
import { codeTaken, promotionInputSchema, toPromotion } from "./promotion-input";
import { applyVoucher, livePromotions } from "./promotions";
import type { Product, Promotion } from "./types";

const NOW = new Date("2026-10-16T05:00:00.000Z");

const promo = (p: Partial<Promotion> & Pick<Promotion, "id">): Promotion => ({
  kind: "voucher",
  channel: "website",
  title: p.id,
  startsAt: "2026-10-13T00:00:00.000+07:00",
  endsAt: "2026-10-18T23:59:59.000+07:00",
  active: true,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  ...p,
});

const all = [
  promo({ id: "campaign", kind: "campaign" }),
  promo({ id: "v15k", code: "ANITOY15K", discountType: "amount", discountValue: 15000, minSpend: 150000 }),
  promo({ id: "v10", code: "ANITOY10", discountType: "percent", discountValue: 10, maxDiscount: 40000, minSpend: 300000 }),
  promo({ id: "tiktok", channel: "tiktok", code: "TTSHOP", discountType: "amount", discountValue: 20000 }),
  promo({ id: "ended", code: "OLD", discountType: "amount", discountValue: 50000, endsAt: "2026-10-01T00:00:00.000Z" }),
  promo({ id: "off", code: "PAUSED", discountType: "amount", discountValue: 50000, active: false }),
];

describe("livePromotions", () => {
  it("keeps running, active promotions; website vouchers first by minimum spend", () => {
    const { campaigns, vouchers } = livePromotions(all, NOW);
    expect(campaigns.map((p) => p.id)).toEqual(["campaign"]);
    expect(vouchers.map((p) => p.id)).toEqual(["v15k", "v10", "tiktok"]);
    expect(livePromotions(all, new Date("2026-10-19T00:00:00.000+07:00")).vouchers).toEqual([]);
  });
});

describe("applyVoucher", () => {
  it("takes a fixed amount off once the minimum spend is reached", () => {
    expect(applyVoucher("anitoy15k ", all, 158000, NOW)).toMatchObject({ discount: 15000 });
    expect(applyVoucher("ANITOY15K", all, 149000, NOW)).toMatchObject({ discount: 0, issue: "min_spend" });
  });

  it("caps percentage vouchers", () => {
    expect(applyVoucher("ANITOY10", all, 316000, NOW).discount).toBe(31600);
    expect(applyVoucher("ANITOY10", all, 900000, NOW).discount).toBe(40000);
  });

  it("never redeems TikTok, ended or paused vouchers on the website", () => {
    for (const code of ["TTSHOP", "OLD", "PAUSED", "NOPE"]) {
      expect(applyVoucher(code, all, 500000, NOW), code).toMatchObject({ discount: 0, issue: "not_found" });
    }
  });
});

describe("buildQuote with a voucher", () => {
  const product: Product = {
    id: "p",
    slug: "p",
    title: "P",
    description: "",
    images: [],
    collection: "frieren",
    category: "mini",
    tags: [],
    attributes: [],
    skus: [{ id: "p1", name: "Std", price: 79000, stock: 10 }],
    tiktokVideoIds: [],
    featured: 0,
    status: "active",
    source: "seed",
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
  };

  it("earns free shipping on the subtotal before the discount", () => {
    const q = buildQuote([{ productId: "p", skuId: "p1", quantity: 2 }], [product], "vi", { voucherCode: "ANITOY15K", promotions: all, now: NOW });
    expect(q).toMatchObject({ subtotal: 158000, discount: 15000, shippingFee: 0, total: 143000, voucher: { code: "ANITOY15K" } });
    expect(q.voucherIssue).toBeUndefined();
  });

  it("reports why a code did not apply", () => {
    const q = buildQuote([{ productId: "p", skuId: "p1", quantity: 1 }], [product], "vi", { voucherCode: "ANITOY15K", promotions: all, now: NOW });
    expect(q).toMatchObject({ discount: 0, voucherIssue: "min_spend", total: 109000 });
  });
});

describe("admin promotion input", () => {
  const base = {
    kind: "voucher" as const,
    channel: "website" as const,
    title: "Giảm 20K",
    code: "fan20k",
    discountType: "amount" as const,
    discountValue: 20000,
    minSpend: 200000,
    startsAt: "2026-11-11T00:00",
    endsAt: "2026-11-11T23:59",
    active: true,
  };

  it("reads datetime-local values as Vietnam time and normalises the code", () => {
    const parsed = promotionInputSchema.parse(base);
    const p = toPromotion(parsed, undefined, NOW);
    expect(p).toMatchObject({ code: "FAN20K", startsAt: "2026-11-10T17:00:00.000Z", endsAt: "2026-11-11T16:59:00.000Z" });
    expect(p.id).toMatch(/^promo-/);
  });

  it("requires a code and a discount for website vouchers, and a sane date range", () => {
    expect(promotionInputSchema.safeParse({ ...base, code: "" }).success).toBe(false);
    expect(promotionInputSchema.safeParse({ ...base, discountValue: undefined }).success).toBe(false);
    expect(promotionInputSchema.safeParse({ ...base, discountType: "percent", discountValue: 150 }).success).toBe(false);
    expect(promotionInputSchema.safeParse({ ...base, endsAt: "2026-11-10T00:00" }).success).toBe(false);
    expect(promotionInputSchema.safeParse({ ...base, channel: "tiktok", code: "", discountValue: undefined }).success).toBe(true);
  });

  it("drops voucher fields from campaigns and keeps createdAt on edit", () => {
    const parsed = promotionInputSchema.parse({ ...base, kind: "campaign" });
    const existing = promo({ id: "c1", kind: "campaign", createdAt: "2026-01-01T00:00:00.000Z" });
    const p = toPromotion(parsed, existing, NOW);
    expect(p).toMatchObject({ id: "c1", kind: "campaign", createdAt: "2026-01-01T00:00:00.000Z", minSpend: 200000 });
    expect(p).not.toHaveProperty("code");
    expect(p).not.toHaveProperty("discountValue");
  });

  it("keeps website codes unique", () => {
    expect(codeTaken("ANITOY15K", "new", all)).toBe(true);
    expect(codeTaken("ANITOY15K", "v15k", all)).toBe(false);
    expect(codeTaken("TTSHOP", "new", all)).toBe(false);
  });
});
