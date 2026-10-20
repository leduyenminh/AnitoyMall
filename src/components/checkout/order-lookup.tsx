"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { fmt, paymentMethodText } from "@/i18n";
import { isOrderCode, normaliseOrderCode, normalisePhone } from "@/lib/checkout/validation";
import { formatMoney } from "@/lib/money";
import type { OrderLookup as LookupResult } from "@/lib/orders";
import { useI18n } from "../i18n";
import { ProductImage } from "../product/product-image";
import { OrderTimeline } from "./order-timeline";
import { recentOrdersStore, type RecentOrder } from "./recent-orders-store";

type Field = "code" | "phone";

/** "Find my order": order code + phone lookup, plus the orders remembered in this browser. */
export function OrderLookup() {
  const { t, lang, href } = useI18n();
  const recent = useSyncExternalStore(recentOrdersStore.subscribe, recentOrdersStore.getSnapshot, recentOrdersStore.getServerSnapshot);
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LookupResult>();
  const resultRef = useRef<HTMLHeadingElement>(null);

  const dateTime = new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  });
  const orderHref = (o: RecentOrder) => `${href(`/order/${o.id}`)}?t=${encodeURIComponent(o.token)}`;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(undefined);
    setResult(undefined);
    const next: Partial<Record<Field, string>> = {};
    if (!isOrderCode(normaliseOrderCode(code))) next.code = t.orderLookup.codeInvalid;
    if (!normalisePhone(phone)) next.phone = t.checkout.errors.phone;
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) {
      document.getElementById(`lookup-${first}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: code, phone }),
      });
      const data = (await res.json().catch(() => ({}))) as { order?: LookupResult };
      if (res.ok && data.order) {
        setResult(data.order);
        requestAnimationFrame(() => resultRef.current?.focus());
      } else {
        setFormError(res.status === 404 ? t.orderLookup.notFound : t.orderLookup.error);
      }
    } catch {
      setFormError(t.orderLookup.error);
    } finally {
      setBusy(false);
    }
  }

  const fieldProps = (field: Field) => ({
    id: `lookup-${field}`,
    "aria-invalid": Boolean(errors[field]) || undefined,
    "aria-describedby": errors[field] ? `lookup-${field}-error` : `lookup-${field}-hint`,
  });
  const saved = result && recent.find((o) => o.id === result.id);
  const money = (n: number) => formatMoney(n, lang, result?.currency);

  return (
    <>
      <form className="card window" onSubmit={submit} noValidate>
        <div className="window__titlebar" aria-hidden="true">
          <span className="window__title">{t.orderLookup.title}</span>
        </div>
        <div className="card__body form-grid">
          <div className="field">
            <label className="label" htmlFor="lookup-code">
              {t.orderLookup.code}
            </label>
            <input
              className="input"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              {...fieldProps("code")}
            />
            {errors.code ? (
              <span id="lookup-code-error" className="field__error">
                {errors.code}
              </span>
            ) : (
              <span id="lookup-code-hint" className="muted small">
                {t.orderLookup.codeHint}
              </span>
            )}
          </div>
          <div className="field">
            <label className="label" htmlFor="lookup-phone">
              {t.orderLookup.phone}
            </label>
            <input
              className="input"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              {...fieldProps("phone")}
            />
            {errors.phone && (
              <span id="lookup-phone-error" className="field__error">
                {errors.phone}
              </span>
            )}
          </div>
          <div className="field field--full">
            {formError && (
              <p className="alert alert--error" role="alert">
                {formError}
              </p>
            )}
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? t.orderLookup.searching : t.orderLookup.submit}
            </button>
          </div>
        </div>
      </form>

      {result && (
        <section className="card window" aria-live="polite">
          <div className="window__titlebar" aria-hidden="true">
            <span className="window__title">{fmt(t.order.title, { id: result.id })}</span>
          </div>
          <div className="card__body">
            <h2 className="card__title" ref={resultRef} tabIndex={-1}>
              {fmt(t.order.title, { id: result.id })}
            </h2>
            <p className="muted small">
              {t.order.placedAt}: {dateTime.format(new Date(result.createdAt))}
            </p>
            <OrderTimeline status={result.status} labels={t.order.statuses} />
            <p className="small">
              {t.order.payment}: <strong>{paymentMethodText(result.paymentMethod, t).label}</strong> ·{" "}
              <span className={result.paymentStatus === "paid" ? "text-success" : "muted"}>{t.order.paymentStatus[result.paymentStatus]}</span>
            </p>
            <ul className="summary-lines">
              {result.lines.map((line) => (
                <li key={`${line.slug}:${line.skuName}`} className="summary-line">
                  <span className="summary-line__media">
                    <ProductImage src={line.image} alt="" sizes="56px" />
                    <span className="summary-line__qty">{line.quantity}</span>
                  </span>
                  <span className="summary-line__info">
                    <Link href={href(`/products/${line.slug}`)}>{line.title}</Link>
                    <span className="muted small">{line.skuName}</span>
                  </span>
                  <span>{money(line.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="totals">
              {result.discount ? (
                <div className="totals__discount">
                  <dt>{t.cart.discount}</dt>
                  <dd>−{money(result.discount)}</dd>
                </div>
              ) : null}
              <div>
                <dt>{t.cart.shipping}</dt>
                <dd>{result.shippingFee ? money(result.shippingFee) : t.cart.free}</dd>
              </div>
              <div className="totals__grand">
                <dt>{t.cart.total}</dt>
                <dd>{money(result.total)}</dd>
              </div>
            </dl>
            <p className="small">
              {t.orderLookup.placedBy}: <strong>{result.customer.name}</strong> · {result.customer.phone} · {result.province}
            </p>
            <p className="muted small">
              {t.orderLookup.masked}{" "}
              <Link href={href("/help")}>{t.orderLookup.contactHint}</Link>
            </p>
            {saved && (
              <Link href={orderHref(saved)} className="btn btn--ghost">
                {t.orderLookup.viewDetails}
              </Link>
            )}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="card window">
          <div className="window__titlebar" aria-hidden="true">
            <span className="window__title">{t.orderLookup.recent}</span>
          </div>
          <div className="card__body">
            <h2 className="card__title">{t.orderLookup.recent}</h2>
            <ul className="recent-orders">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link href={orderHref(o)}>
                    <strong>{o.id}</strong>
                  </Link>
                  <span className="muted small">{dateTime.format(new Date(o.createdAt))}</span>
                  <span>{formatMoney(o.total, lang)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
