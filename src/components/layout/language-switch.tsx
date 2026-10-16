"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { switchLocalePath } from "@/i18n/config";
import { useI18n } from "../i18n";

export function LanguageSwitch() {
  const { lang, t } = useI18n();
  const pathname = usePathname() ?? "/";
  const other = lang === "vi" ? "en" : "vi";
  return (
    <Link
      href={switchLocalePath(pathname, other)}
      hrefLang={other}
      lang={other}
      className="lang-switch"
      aria-label={`${t.lang.label}: ${t.lang[other]}`}
      title={t.lang[other]}
    >
      {other.toUpperCase()}
    </Link>
  );
}
