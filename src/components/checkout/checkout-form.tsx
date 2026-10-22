"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { provinces } from "@/lib/checkout/provinces";
import { isValidEmail, normalisePhone } from "@/lib/checkout/validation";
import { fmt, paymentMethodText } from "@/i18n";
import { formatMoney, formatShortMoney } from "@/lib/money";
import type { PaymentMethod } from "@/lib/types";
import { attribution, trackPixel } from "../analytics/pixel";
import { useCart } from "../cart/cart-context";
import { lineNotice } from "../cart/cart-view";
import { FreeShippingMeter } from "../cart/free-shipping-meter";
import { useServerQuote } from "../cart/use-quote";
import { useI18n } from "../i18n";
import { BagIcon, CashIcon } from "../icons";
import { ProductImage } from "../product/product-image";
import { recentOrdersStore } from "./recent-orders-store";

type Field = "name" | "phone" | "email" | "province" | "ward" | "street";

const DRAFT_KEY = "anitoy.checkout.draft";

interface Draft {
  name: string;
  phone: string;
  email: string;
  province: string;
  ward: string;
  street: string;
  note: string;
}

const emptyDraft: Draft = { name: "", phone: "", email: "", province: "", ward: "", street: "", note: "" };

function loadDraft(): Draft {
  if (typeof window === "undefined") return emptyDraft;
  try {
    return { ...emptyDraft, ...(JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}") as Partial<Draft>) };
  } catch {
    return emptyDraft;
  }
}

export interface CheckoutVoucher {
  code: string;
  title: string;
  minSpend?: number;
}

const ONLINE: PaymentMethod[] = ["zalopay", "momo", "card", "atm"];

export function CheckoutForm({ methods, vouchers }: { methods: PaymentMethod[]; vouchers: CheckoutVoucher[] }) {
  const { t, lang, href } = useI18n();
  const cart = useCart();
  const router = useRouter();
  const [voucherInput, setVoucherInput] = useState("");
  const [voucherCode, setVoucherCode] = useState<string>();
  const { quote, refresh } = useServerQuote(cart.lines, lang, voucherCode);
  const subtotal = quote?.subtotal ?? cart.subtotal;
  const voucherApplied = Boolean(voucherCode && quote?.voucher && !quote.voucherIssue);
  const voucherMessage =
    voucherCode && quote?.voucherIssue === "not_found"
      ? t.checkout.voucherNotFound
      : voucherCode && quote?.voucherIssue === "min_spend"
        ? fmt(t.checkout.voucherMinSpend, { code: voucherCode, amount: formatMoney(quote.voucher?.minSpend ?? 0, lang) })
        : undefined;
  // Returning customers get their details back (stored only in this browser).
  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [payment, setPayment] = useState<PaymentMethod>(methods[0] ?? "cod");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState(false);
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current || cart.lines.length === 0) return;
    tracked.current = true;
    trackPixel("InitiateCheckout", {
      contents: cart.lines.map((l) => ({ content_id: l.productId, content_name: l.title, quantity: l.quantity, price: l.price })),
      value: cart.subtotal,
    });
  }, [cart.lines, cart.subtotal]);

  const set = (field: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const next = { ...draft, [field]: e.target.value };
    setDraft(next);
    if (errors[field as Field]) setErrors({ ...errors, [field]: undefined });
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...next, note: "" }));
    } catch {
      // ignore
    }
  };

  function validate(): boolean {
    const next: Partial<Record<Field, string>> = {};
    if (draft.name.trim().length < 2) next.name = t.checkout.errors.required;
    if (!normalisePhone(draft.phone)) next.phone = t.checkout.errors.phone;
    if (draft.email.trim() && !isValidEmail(draft.email)) next.email = t.checkout.errors.email;
    if (!draft.province) next.province = t.checkout.errors.required;
    if (draft.ward.trim().length < 2) next.ward = t.checkout.errors.required;
    if (draft.street.trim().length < 3) next.street = t.checkout.errors.required;
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) document.getElementById(`co-${first}`)?.focus();
    return !first;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(undefined);
    if (!validate()) return;
    if (cart.lines.length === 0) {
      setFormError(t.checkout.errors.empty);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          locale: lang,
          items: cart.lines.map((l) => ({ productId: l.productId, skuId: l.skuId, quantity: l.quantity, price: l.price })),
          customer: { name: draft.name, phone: draft.phone, email: draft.email || undefined },
          address: { province: draft.province, ward: draft.ward, street: draft.street },
          note: draft.note || undefined,
          paymentMethod: payment,
          ...(voucherApplied ? { voucherCode } : {}),
          attribution: attribution(),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        id?: string;
        token?: string;
        total?: number;
        error?: string;
        paymentUrl?: string;
        paymentError?: boolean;
      };
      if (res.ok && json.id && json.token) {
        // Saved before any gateway redirect, so the order can be found even if the shopper never returns.
        recentOrdersStore.remember({ id: json.id, token: json.token, total: json.total ?? 0, createdAt: new Date().toISOString() });
        // Keep showing progress (not an empty cart) while the next page loads.
        setPlaced(true);
        cart.clear();
        if (json.paymentUrl) {
          window.location.assign(json.paymentUrl);
        } else {
          const status = json.paymentError ? "&payment=start_failed" : "";
          router.push(`${href(`/order/${json.id}`)}?t=${encodeURIComponent(json.token)}&new=1${status}`);
        }
        return;
      }
      // Prices, stock or the voucher changed: refresh the quote and ask the shopper to review.
      setFormError(
        json.error === "quote_changed"
          ? t.checkout.errors.stock
          : json.error === "voucher_invalid"
            ? t.checkout.errors.voucher
            : t.checkout.errors.generic,
      );
      if (json.error === "quote_changed" || json.error === "voucher_invalid") refresh();
    } catch {
      setFormError(t.checkout.errors.generic);
    }
    setSubmitting(false);
  }

  if (placed) {
    return (
      <div className="empty-state card" role="status">
        <p className="empty-state__title">{ONLINE.includes(payment) ? t.checkout.redirecting : t.checkout.placing}</p>
      </div>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <div className="empty-state card">
        <BagIcon size={48} />
        <p className="empty-state__title">{t.cart.empty}</p>
        <Link href={href("/shop")} className="btn btn--primary">
          {t.home.shopNow}
        </Link>
      </div>
    );
  }

  const fieldProps = (field: Field) => ({
    id: `co-${field}`,
    "aria-invalid": Boolean(errors[field]) || undefined,
    "aria-describedby": errors[field] ? `co-${field}-error` : undefined,
  });
  const fieldError = (field: Field) =>
    errors[field] ? (
      <span id={`co-${field}-error`} className="field__error">
        {errors[field]}
      </span>
    ) : null;

  return (
    <form className="checkout" onSubmit={submit} noValidate>
      <div className="checkout__main">
        <section className="card window">
          <div className="window__titlebar" aria-hidden="true">
            <span className="window__title">{t.checkout.contact}</span>
          </div>
          <div className="card__body form-grid">
            <h2 className="card__title">{t.checkout.contact}</h2>
            <div className="field field--full">
              <label className="label" htmlFor="co-name">{t.checkout.name}</label>
              <input className="input" autoComplete="name" value={draft.name} onChange={set("name")} required {...fieldProps("name")} />
              {fieldError("name")}
            </div>
            <div className="field">
              <label className="label" htmlFor="co-phone">{t.checkout.phone}</label>
              <input className="input" type="tel" inputMode="tel" autoComplete="tel" value={draft.phone} onChange={set("phone")} required {...fieldProps("phone")} />
              {fieldError("phone")}
            </div>
            <div className="field">
              <label className="label" htmlFor="co-email">{t.checkout.email}</label>
              <input className="input" type="email" autoComplete="email" value={draft.email} onChange={set("email")} {...fieldProps("email")} />
              {fieldError("email")}
            </div>
          </div>
        </section>

        <section className="card window">
          <div className="window__titlebar" aria-hidden="true">
            <span className="window__title">{t.checkout.address}</span>
          </div>
          <div className="card__body form-grid">
            <h2 className="card__title">{t.checkout.address}</h2>
            <div className="field field--full">
              <label className="label" htmlFor="co-province">{t.checkout.province}</label>
              <select className="select" autoComplete="address-level1" value={draft.province} onChange={set("province")} required {...fieldProps("province")}>
                <option value="">{t.checkout.provincePlaceholder}</option>
                {provinces.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              {fieldError("province")}
            </div>
            <div className="field">
              <label className="label" htmlFor="co-ward">{t.checkout.ward}</label>
              <input className="input" autoComplete="address-level3" value={draft.ward} onChange={set("ward")} required {...fieldProps("ward")} />
              {fieldError("ward")}
            </div>
            <div className="field">
              <label className="label" htmlFor="co-street">{t.checkout.street}</label>
              <input className="input" autoComplete="street-address" value={draft.street} onChange={set("street")} required {...fieldProps("street")} />
              {fieldError("street")}
            </div>
            <div className="field field--full">
              <label className="label" htmlFor="co-note">{t.checkout.note}</label>
              <textarea id="co-note" className="textarea" rows={2} maxLength={500} placeholder={t.checkout.notePlaceholder} value={draft.note} onChange={set("note")} />
            </div>
          </div>
        </section>

        <section className="card window">
          <div className="window__titlebar" aria-hidden="true">
            <span className="window__title">{t.checkout.payment}</span>
          </div>
          <div className="card__body">
            <fieldset className="pay-options">
              <legend className="card__title">{t.checkout.payment}</legend>
              {methods.map((method) => {
                const { label, description } = paymentMethodText(method, t);
                return (
                  <label key={method} className="pay-option">
                    <input type="radio" name="payment" value={method} checked={payment === method} onChange={() => setPayment(method)} />
                    <span className="pay-option__body">
                      <span className="pay-option__title">
                        <PaymentIcon method={method} /> {label}
                      </span>
                      <span className="muted small">{description}</span>
                    </span>
                  </label>
                );
              })}
              <p className="muted small pay-options__note">{t.checkout.tiktokOnly}</p>
            </fieldset>
          </div>
        </section>
      </div>

      <aside className="checkout__summary card window">
        <div className="window__titlebar" aria-hidden="true">
          <span className="window__title">{t.checkout.summary}</span>
        </div>
        <div className="card__body">
          <h2 className="card__title">{t.checkout.summary}</h2>
          <ul className="summary-lines">
            {cart.lines.map((line) => {
              const ql = quote?.lines.find((q) => q.productId === line.productId && q.skuId === line.skuId);
              const notice = lineNotice(ql, t);
              return (
                <li key={`${line.productId}:${line.skuId}`} className="summary-line">
                  <span className="summary-line__media">
                    <ProductImage src={line.image} alt="" sizes="56px" />
                    <span className="summary-line__qty">{line.quantity}</span>
                  </span>
                  <span className="summary-line__info">
                    <span>{line.title}</span>
                    <span className="muted small">{line.skuName}</span>
                    {notice && <span className="cart-line__notice">{notice}</span>}
                  </span>
                  <span>{formatMoney(line.price * line.quantity, lang)}</span>
                </li>
              );
            })}
          </ul>
          <FreeShippingMeter subtotal={subtotal} />
          <div className="voucher-box">
            <label className="label" htmlFor="co-voucher">
              {t.checkout.voucher}
            </label>
            {voucherApplied ? (
              <div className="voucher-box__applied">
                <span>{fmt(t.checkout.voucherApplied, { code: voucherCode! })}</span>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setVoucherCode(undefined)}>
                  {t.checkout.removeVoucher}
                </button>
              </div>
            ) : (
              <div className="voucher-box__row">
                <input
                  id="co-voucher"
                  className="input"
                  value={voucherInput}
                  placeholder={t.checkout.voucherPlaceholder}
                  autoComplete="off"
                  onChange={(e) => setVoucherInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (voucherInput.trim()) setVoucherCode(voucherInput.trim().toUpperCase());
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  disabled={!voucherInput.trim()}
                  onClick={() => setVoucherCode(voucherInput.trim().toUpperCase())}
                >
                  {t.checkout.applyVoucher}
                </button>
              </div>
            )}
            {voucherMessage && <p className="field__error">{voucherMessage}</p>}
            {!voucherApplied && vouchers.length > 0 && (
              <div className="voucher-box__suggestions" role="group" aria-label={t.checkout.availableVouchers}>
                {vouchers.map((v) => (
                  <button
                    key={v.code}
                    type="button"
                    className="voucher-suggestion"
                    disabled={subtotal < (v.minSpend ?? 0)}
                    onClick={() => {
                      setVoucherInput(v.code);
                      setVoucherCode(v.code);
                    }}
                  >
                    <b>{v.code}</b> {v.title}
                    {v.minSpend ? ` · ${fmt(t.promo.minSpend, { amount: formatShortMoney(v.minSpend) })}` : ""}
                  </button>
                ))}
              </div>
            )}
          </div>
          <dl className="totals">
            <div>
              <dt>{t.cart.subtotal}</dt>
              <dd>{formatMoney(subtotal, lang)}</dd>
            </div>
            {quote && quote.discount > 0 && (
              <div className="totals__discount">
                <dt>
                  {t.cart.discount} ({quote.voucher?.code})
                </dt>
                <dd>−{formatMoney(quote.discount, lang)}</dd>
              </div>
            )}
            <div>
              <dt>{t.cart.shipping}</dt>
              <dd>{!quote ? "…" : quote.shippingFee ? formatMoney(quote.shippingFee, lang) : t.cart.free}</dd>
            </div>
            <div className="totals__grand">
              <dt>{t.cart.total}</dt>
              <dd>{formatMoney(quote?.total ?? cart.subtotal, lang)}</dd>
            </div>
          </dl>
          {formError && (
            <p className="alert alert--error" role="alert">
              {formError}
            </p>
          )}
          <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={submitting || !quote || quote.hasIssues}>
            {submitting ? t.checkout.placing : `${t.checkout.placeOrder} · ${formatMoney(quote?.total ?? cart.subtotal, lang)}`}
          </button>
          <p className="muted small">{t.checkout.privacy}</p>
        </div>
      </aside>
    </form>
  );
}

/** Small text badges for the payment options (no third-party logos). */
function PaymentIcon({ method }: { method: PaymentMethod }) {
  if (method === "cod") return <CashIcon size={18} />;
  const label = { bank_transfer: "QR", zalopay: "Zalo", momo: "MoMo", card: "VISA", atm: "ATM" }[method];
  return (
    <span className={`pay-option__icon pay-option__icon--${method}`} aria-hidden="true">
      {label}
    </span>
  );
}
