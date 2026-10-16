"use client";

import type { Dictionary } from "@/i18n";
import type { Locale } from "@/lib/types";
import { CartProvider } from "./cart/cart-context";
import { I18nProvider } from "./i18n";

export function Providers({ lang, t, children }: { lang: Locale; t: Dictionary; children: React.ReactNode }) {
  return (
    <I18nProvider lang={lang} t={t}>
      <CartProvider>{children}</CartProvider>
    </I18nProvider>
  );
}
