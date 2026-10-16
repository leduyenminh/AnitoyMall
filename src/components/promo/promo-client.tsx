"use client";

import { useEffect, useState } from "react";
import { fmt } from "@/i18n";
import { useI18n } from "../i18n";
import { CheckIcon } from "../icons";

/** "Còn 2 ngày 5 giờ" – refreshes every minute and disappears once the campaign has ended. */
export function Countdown({ endsAt }: { endsAt: string }) {
  const { t } = useI18n();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);
  if (now === null) return null;
  const left = Date.parse(endsAt) - now;
  if (left <= 0) return null;
  const minutes = Math.floor(left / 60_000);
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  const time = d > 0 ? fmt(t.promo.days, { d, h }) : fmt(t.promo.hours, { h, m });
  return <span className="promo-strip__time">{fmt(t.promo.endsIn, { time })}</span>;
}

export function CopyCode({ code }: { code: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="voucher-ticket__code"
      aria-label={`${t.promo.copy}: ${code}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          // Clipboard blocked: the code is visible and selectable anyway.
        }
      }}
    >
      <span className="voucher-ticket__code-text">{code}</span>
      <span className="voucher-ticket__copy" aria-live="polite">
        {copied ? (
          <>
            <CheckIcon size={14} /> {t.promo.copied}
          </>
        ) : (
          t.promo.copy
        )}
      </span>
    </button>
  );
}
