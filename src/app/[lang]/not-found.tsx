"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n";

export default function NotFound() {
  const { t, href } = useI18n();
  return (
    <div className="container page narrow">
      <div className="empty-state card window">
        <div className="window__titlebar" aria-hidden="true">
          <span className="window__title">Error</span>
        </div>
        <p className="big-code" aria-hidden="true">
          404
        </p>
        <h1 className="empty-state__title">{t.common.notFoundTitle}</h1>
        <p className="muted">{t.common.notFoundText}</p>
        <Link href={href("/")} className="btn btn--primary">
          {t.common.backHome}
        </Link>
      </div>
    </div>
  );
}
