"use client";

import { createContext, useContext } from "react";
import type { Dictionary } from "@/i18n";
import { localePath } from "@/i18n/config";
import type { Locale } from "@/lib/types";

const I18nContext = createContext<{ lang: Locale; t: Dictionary } | null>(null);

export function I18nProvider({ lang, t, children }: { lang: Locale; t: Dictionary; children: React.ReactNode }) {
  return <I18nContext.Provider value={{ lang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return { ...value, href: (path: string) => localePath(value.lang, path) };
}
