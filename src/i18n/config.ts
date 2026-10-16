import type { Locale } from "@/lib/types";

export const locales: readonly Locale[] = ["vi", "en"];
export const defaultLocale: Locale = "vi";

export function isLocale(value: string | undefined): value is Locale {
  return value === "vi" || value === "en";
}

/**
 * Vietnamese is the default locale and lives at the root ("/shop"); other locales are prefixed
 * ("/en/shop"). The proxy rewrites unprefixed paths to "/vi/...".
 */
export function localePath(locale: Locale, path: string = "/"): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === defaultLocale) return clean;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}

/** Swap the locale of a path that is already localised. */
export function switchLocalePath(pathname: string, to: Locale): string {
  const stripped = pathname.replace(/^\/(en|vi)(?=\/|$)/, "") || "/";
  return localePath(to, stripped);
}
