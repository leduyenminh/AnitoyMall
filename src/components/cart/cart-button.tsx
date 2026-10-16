"use client";

import { fmt } from "@/i18n";
import { useI18n } from "../i18n";
import { BagIcon } from "../icons";
import { useCart } from "./cart-context";

export function CartButton() {
  const { t } = useI18n();
  const { count, open } = useCart();
  return (
    <button type="button" className="icon-btn cart-button" onClick={open} aria-label={fmt(t.nav.openCart, { n: count })}>
      <BagIcon />
      {count > 0 && (
        <span className="cart-button__count" aria-hidden="true">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
