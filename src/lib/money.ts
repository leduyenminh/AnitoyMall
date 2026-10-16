import { site } from "./site";
import type { Locale } from "./types";

const intlLocale: Record<Locale, string> = { vi: "vi-VN", en: "en-US" };

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(locale: Locale, currency: string): Intl.NumberFormat {
  const key = `${locale}:${currency}`;
  let fmt = formatters.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(intlLocale[locale], { style: "currency", currency });
    formatters.set(key, fmt);
  }
  return fmt;
}

/** Number of minor-unit digits for a currency (VND: 0, USD: 2). */
export function currencyExponent(currency: string = site.currency): number {
  return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
    .maximumFractionDigits ?? 2;
}

/** Format an amount held in minor units. */
export function formatMoney(minor: number, locale: Locale, currency: string = site.currency): string {
  return formatter(locale, currency).format(minor / 10 ** currencyExponent(currency));
}

/** Convert a decimal string from an external API ("79000", "12.99") to integer minor units. */
export function toMinorUnits(amount: string | number, currency: string = site.currency): number {
  const value = typeof amount === "number" ? amount : Number.parseFloat(amount);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10 ** currencyExponent(currency));
}

/** Convert minor units back to a decimal number for external APIs (TikTok Events API, JSON-LD). */
export function fromMinorUnits(minor: number, currency: string = site.currency): number {
  return minor / 10 ** currencyExponent(currency);
}

export function percentOff(price: number, compareAt?: number): number | undefined {
  if (!compareAt || compareAt <= price) return undefined;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

/** "150K", "1.2M" – the shorthand Vietnamese shoppers use for VND amounts in vouchers. */
export function formatShortMoney(minor: number, currency: string = site.currency): string {
  const value = fromMinorUnits(minor, currency);
  if (currency !== "VND") return formatMoney(minor, "en", currency);
  if (value >= 1_000_000) return `${+(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${+(value / 1000).toFixed(1)}K`;
  return `${value}đ`;
}
