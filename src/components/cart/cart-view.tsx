"use client";

import Link from "next/link";
import { fmt } from "@/i18n";
import type { QuoteLine } from "@/lib/checkout/quote";
import { formatMoney } from "@/lib/money";
import { useI18n } from "../i18n";
import { BagIcon } from "../icons";
import { useCart } from "./cart-context";
import { CartLineItem } from "./cart-line-item";
import { FreeShippingMeter } from "./free-shipping-meter";
import { useServerQuote } from "./use-quote";

export function lineNotice(line: QuoteLine | undefined, t: ReturnType<typeof useI18n>["t"]): string | undefined {
  if (!line?.issue) return undefined;
  if (line.issue === "unavailable") return t.cart.unavailable;
  if (line.issue === "insufficient_stock") return fmt(t.cart.onlyLeft, { n: line.quantity });
  return t.cart.priceChanged;
}

export function CartView() {
  const { t, lang, href } = useI18n();
  const cart = useCart();
  const { quote } = useServerQuote(cart.lines, lang);

  if (cart.lines.length === 0) {
    return (
      <div className="empty-state card">
        <BagIcon size={48} />
        <p className="empty-state__title">{t.cart.empty}</p>
        <p className="muted">{t.cart.emptyHint}</p>
        <Link href={href("/shop")} className="btn btn--primary">
          {t.home.shopNow}
        </Link>
      </div>
    );
  }

  const subtotal = quote?.subtotal ?? cart.subtotal;
  const shipping = quote?.shippingFee;
  const blocked = quote?.lines.some((l) => l.issue === "unavailable");

  return (
    <div className="cart-page">
      <section className="card window">
        <div className="window__titlebar" aria-hidden="true">
          <span className="window__title">{t.cart.title}</span>
        </div>
        <div className="card__body">
          <FreeShippingMeter subtotal={subtotal} />
          <ul className="cart-lines">
            {cart.lines.map((line) => (
              <CartLineItem
                key={`${line.productId}:${line.skuId}`}
                line={line}
                notice={lineNotice(quote?.lines.find((q) => q.productId === line.productId && q.skuId === line.skuId), t)}
              />
            ))}
          </ul>
          <p className="muted small">{t.cart.orderOnTikTok}</p>
        </div>
      </section>
      <aside className="card window summary">
        <div className="window__titlebar" aria-hidden="true">
          <span className="window__title">{t.checkout.summary}</span>
        </div>
        <div className="card__body">
          <dl className="totals">
            <div>
              <dt>{t.cart.subtotal}</dt>
              <dd>{formatMoney(subtotal, lang)}</dd>
            </div>
            <div>
              <dt>{t.cart.shipping}</dt>
              <dd>{shipping === undefined ? "…" : shipping ? formatMoney(shipping, lang) : t.cart.free}</dd>
            </div>
            <div className="totals__grand">
              <dt>{t.cart.total}</dt>
              <dd>{formatMoney(quote?.total ?? subtotal, lang)}</dd>
            </div>
          </dl>
          {blocked ? (
            <p className="alert alert--warning">{t.checkout.errors.stock}</p>
          ) : (
            <Link href={href("/checkout")} className="btn btn--primary btn--lg btn--block">
              {t.cart.checkout}
            </Link>
          )}
          <Link href={href("/shop")} className="btn btn--ghost btn--block">
            {t.cart.continue}
          </Link>
        </div>
      </aside>
    </div>
  );
}
