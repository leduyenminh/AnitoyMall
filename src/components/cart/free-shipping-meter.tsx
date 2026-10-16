"use client";

import { fmt } from "@/i18n";
import { formatMoney } from "@/lib/money";
import { site } from "@/lib/site";
import { useI18n } from "../i18n";
import { TruckIcon } from "../icons";

/** Progress towards free shipping – a proven nudge for larger baskets. */
export function FreeShippingMeter({ subtotal }: { subtotal: number }) {
  const { t, lang } = useI18n();
  const threshold = site.shipping.freeThreshold;
  const remaining = Math.max(0, threshold - subtotal);
  const pct = Math.min(100, Math.round((subtotal / threshold) * 100));
  return (
    <div className={`ship-meter${remaining === 0 ? " is-done" : ""}`}>
      <p className="ship-meter__label">
        <TruckIcon size={18} />
        {remaining === 0 ? t.cart.freeShipUnlocked : fmt(t.cart.freeShipProgress, { amount: formatMoney(remaining, lang) })}
      </p>
      <div className="ship-meter__track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="ship-meter__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
