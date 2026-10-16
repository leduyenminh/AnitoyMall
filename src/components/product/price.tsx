import { formatMoney, percentOff } from "@/lib/money";
import type { Locale } from "@/lib/types";

export function Price({
  amount,
  compareAt,
  locale,
  fromLabel,
  size = "md",
}: {
  amount: number;
  compareAt?: number;
  locale: Locale;
  /** Shown before the amount when a product has several prices. */
  fromLabel?: string;
  size?: "md" | "lg";
}) {
  const off = percentOff(amount, compareAt);
  return (
    <span className={`price price--${size}`}>
      {fromLabel && <span className="price__from">{fromLabel}</span>}
      <span className="price__now">{formatMoney(amount, locale)}</span>
      {off !== undefined && compareAt && (
        <>
          <s className="price__was">{formatMoney(compareAt, locale)}</s>
          <span className="price__off">-{off}%</span>
        </>
      )}
    </span>
  );
}
