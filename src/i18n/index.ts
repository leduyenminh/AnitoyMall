import type { Locale, PaymentMethod } from "@/lib/types";
import { en } from "./dictionaries/en";
import { vi, type Dictionary } from "./dictionaries/vi";

const dictionaries: Record<Locale, Dictionary> = { vi, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** Fill `{name}` placeholders. */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/** Name and one-line description of a payment method. */
export function paymentMethodText(method: PaymentMethod, t: Dictionary): { label: string; description: string } {
  const c = t.checkout;
  const text: Record<PaymentMethod, [string, string]> = {
    cod: [c.cod, c.codDesc],
    bank_transfer: [c.bank, c.bankDesc],
    zalopay: [c.zalopay, c.zalopayDesc],
    momo: [c.momo, c.momoDesc],
    card: [c.card, c.cardDesc],
    atm: [c.atm, c.atmDesc],
  };
  const [label, description] = text[method];
  return { label, description };
}

export type { Dictionary };
