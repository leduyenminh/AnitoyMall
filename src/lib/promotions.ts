import type { Locale, Promotion } from "./types";

export function isLive(p: Promotion, now = new Date()): boolean {
  const t = now.getTime();
  return p.active && Date.parse(p.startsAt) <= t && t <= Date.parse(p.endsAt);
}

/** Running promotions, campaigns first, then vouchers by the order shoppers can reach them. */
export function livePromotions(all: Promotion[], now = new Date()) {
  const live = all.filter((p) => isLive(p, now));
  return {
    campaigns: live.filter((p) => p.kind === "campaign").sort((a, b) => a.endsAt.localeCompare(b.endsAt)),
    vouchers: live
      .filter((p) => p.kind === "voucher")
      .sort((a, b) => Number(a.channel === "tiktok") - Number(b.channel === "tiktok") || (a.minSpend ?? 0) - (b.minSpend ?? 0)),
  };
}

export const normaliseCode = (code: string) => code.trim().toUpperCase();

export type VoucherIssue = "not_found" | "min_spend";

/** A website voucher applied to a merchandise subtotal. */
export function applyVoucher(
  code: string,
  all: Promotion[],
  subtotal: number,
  now = new Date(),
): { voucher?: Promotion; discount: number; issue?: VoucherIssue } {
  const wanted = normaliseCode(code);
  const voucher = all.find(
    (p) => p.kind === "voucher" && p.channel === "website" && p.code && normaliseCode(p.code) === wanted && isLive(p, now),
  );
  if (!voucher) return { discount: 0, issue: "not_found" };
  if (subtotal < (voucher.minSpend ?? 0)) return { voucher, discount: 0, issue: "min_spend" };
  const value = voucher.discountValue ?? 0;
  const raw = voucher.discountType === "percent" ? Math.round((subtotal * value) / 100) : value;
  const capped = voucher.maxDiscount ? Math.min(raw, voucher.maxDiscount) : raw;
  return { voucher, discount: Math.max(0, Math.min(capped, subtotal)) };
}

export const promoTitle = (p: Promotion, locale: Locale) => (locale === "en" && p.titleEn) || p.title;
export const promoDescription = (p: Promotion, locale: Locale) => (locale === "en" && p.descriptionEn) || p.description;
