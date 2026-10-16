"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { fmt } from "@/i18n";
import { shippingFor } from "@/lib/checkout/quote";
import { formatMoney } from "@/lib/money";
import { useI18n } from "../i18n";
import { BagIcon, CloseIcon } from "../icons";
import { useCart } from "./cart-context";
import { CartLineItem } from "./cart-line-item";
import { FreeShippingMeter } from "./free-shipping-meter";

export function CartDrawer() {
  const { t, lang, href } = useI18n();
  const cart = useCart();
  const dialog = useRef<HTMLDialogElement>(null);

  // Mirror the open state onto the native <dialog> (focus trap, Esc, inert background).
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (cart.isOpen && !el.open) el.showModal();
    if (!cart.isOpen && el.open) el.close();
  }, [cart.isOpen]);

  const shipping = shippingFor(cart.subtotal);

  return (
    <dialog
      ref={dialog}
      className="drawer window"
      aria-labelledby="cart-drawer-title"
      onClose={cart.close}
      onClick={(event) => {
        // Clicking the backdrop (the dialog element itself) closes it.
        if (event.target === event.currentTarget) cart.close();
      }}
    >
      <div className="window__titlebar">
        <span className="window__title">{t.cart.title}</span>
      </div>
      <div className="drawer__inner">
        <header className="drawer__header">
          <h2 id="cart-drawer-title" className="drawer__title">
            {t.cart.title} <span className="muted">({fmt(t.cart.items, { n: cart.count })})</span>
          </h2>
          <button type="button" className="icon-btn" onClick={cart.close} aria-label={t.cart.close}>
            <CloseIcon />
          </button>
        </header>

        {cart.lines.length === 0 ? (
          <div className="empty-state">
            <BagIcon size={40} />
            <p className="empty-state__title">{t.cart.empty}</p>
            <p className="muted">{t.cart.emptyHint}</p>
            <Link href={href("/shop")} className="btn btn--primary" onClick={cart.close}>
              {t.home.shopNow}
            </Link>
          </div>
        ) : (
          <>
            <FreeShippingMeter subtotal={cart.subtotal} />
            <ul className="cart-lines">
              {cart.lines.map((line) => (
                <CartLineItem key={`${line.productId}:${line.skuId}`} line={line} compact onNavigate={cart.close} />
              ))}
            </ul>
            <footer className="drawer__footer">
              <dl className="totals">
                <div>
                  <dt>{t.cart.subtotal}</dt>
                  <dd>{formatMoney(cart.subtotal, lang)}</dd>
                </div>
                <div>
                  <dt>{t.cart.shipping}</dt>
                  <dd>{shipping ? formatMoney(shipping, lang) : t.cart.free}</dd>
                </div>
                <div className="totals__grand">
                  <dt>{t.cart.total}</dt>
                  <dd>{formatMoney(cart.subtotal + shipping, lang)}</dd>
                </div>
              </dl>
              <Link href={href("/checkout")} className="btn btn--primary btn--lg btn--block" onClick={cart.close}>
                {t.cart.checkout}
              </Link>
              <Link href={href("/cart")} className="btn btn--ghost btn--block" onClick={cart.close}>
                {t.cart.viewCart}
              </Link>
            </footer>
          </>
        )}
      </div>
    </dialog>
  );
}
