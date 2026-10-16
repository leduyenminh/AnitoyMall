"use client";

import { useI18n } from "@/components/i18n";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return (
    <div className="container page narrow">
      <div className="empty-state card window" role="alert">
        <div className="window__titlebar" aria-hidden="true">
          <span className="window__title">Error</span>
        </div>
        <h1 className="empty-state__title">{t.common.errorTitle}</h1>
        <button type="button" className="btn btn--primary" onClick={reset}>
          {t.common.retry}
        </button>
      </div>
    </div>
  );
}
