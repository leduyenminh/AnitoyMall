import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderTimeline } from "@/components/checkout/order-timeline";
import { OrderTracker } from "@/components/checkout/order-tracker";
import { PayNowButton } from "@/components/checkout/pay-now-button";
import { RememberOrder } from "@/components/checkout/remember-order";
import { ProductImage } from "@/components/product/product-image";
import { fmt, getDictionary, paymentMethodText } from "@/i18n";
import { isLocale, localePath } from "@/i18n/config";
import { formatMoney } from "@/lib/money";
import { getOrderForViewer, isOnlinePayment } from "@/lib/orders";
import { site, vietQrImageUrl } from "@/lib/site";

// Personal data: never cache, never index.
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ lang: string; id: string }> }): Promise<Metadata> {
  const { lang, id } = await params;
  const title = isLocale(lang) ? fmt(getDictionary(lang).order.title, { id }) : id;
  return { title, robots: { index: false, follow: false } };
}

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; id: string }>;
  searchParams: Promise<{ t?: string; new?: string; payment?: string }>;
}) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const { t: token, new: isNew, payment: paymentResult } = await searchParams;
  const t = getDictionary(lang);
  const order = await getOrderForViewer(id, token);
  const money = (n: number) => formatMoney(n, lang, order?.currency);

  if (!order) {
    return (
      <div className="container page narrow">
        <div className="empty-state card">
          <p className="empty-state__title">{t.order.notFound}</p>
          <p className="muted">{t.order.notFoundHint}</p>
          <Link href={localePath(lang, "/order")} className="btn btn--primary">
            {t.nav.trackOrder}
          </Link>
          <Link href={localePath(lang, "/")} className="btn btn--ghost">
            {t.common.backHome}
          </Link>
        </div>
      </div>
    );
  }

  const qr = order.paymentMethod === "bank_transfer" && order.paymentStatus === "unpaid" && order.status !== "cancelled"
    ? vietQrImageUrl(order.total, order.id)
    : undefined;
  const awaitingOnline = isOnlinePayment(order) && order.paymentStatus === "unpaid" && order.status !== "cancelled";
  const placed = new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(order.createdAt));

  return (
    <div className="container page narrow order">
      {isNew && <OrderTracker order={{ id: order.id, total: order.total, lines: order.lines.map((l) => ({ id: l.productId, title: l.title, quantity: l.quantity, price: l.unitPrice })) }} />}
      <RememberOrder order={{ id: order.id, token: order.accessToken, total: order.total, createdAt: order.createdAt }} />

      <header className="page__head">
        {isNew && <p className="eyebrow">✨ {t.order.thanks}</p>}
        <h1 className="page__title">{fmt(t.order.title, { id: order.id })}</h1>
        <p className="muted">
          {t.order.placedAt}: {placed} · {isNew ? t.order.received : t.order.keepLink}
        </p>
      </header>

      {paymentResult === "success" && order.paymentStatus === "paid" && (
        <p className="alert alert--success" role="status">
          {t.order.paymentSuccess}
        </p>
      )}
      {paymentResult === "failed" && awaitingOnline && (
        <p className="alert alert--error" role="alert">
          {t.order.paymentFailed}
        </p>
      )}
      {paymentResult === "start_failed" && awaitingOnline && (
        <p className="alert alert--error" role="alert">
          {t.order.paymentStartFailed}
        </p>
      )}

      <section className="card window">
        <div className="window__titlebar" aria-hidden="true">
          <span className="window__title">{t.order.status}</span>
        </div>
        <div className="card__body">
          <OrderTimeline status={order.status} labels={t.order.statuses} />
          <p className="small">
            {t.order.payment}: <strong>{paymentMethodText(order.paymentMethod, t).label}</strong> ·{" "}
            <span className={order.paymentStatus === "paid" ? "text-success" : "muted"}>{t.order.paymentStatus[order.paymentStatus]}</span>
          </p>
          {order.paymentMethod === "cod" && order.paymentStatus === "unpaid" && order.status !== "cancelled" && (
            <p className="muted small">{fmt(t.order.codHint, { amount: money(order.total) })}</p>
          )}
          {awaitingOnline && token && (
            <>
              <p className="muted small">{t.order.awaitingPayment}</p>
              <PayNowButton orderId={order.id} token={token} />
            </>
          )}
        </div>
      </section>

      {qr && (
        <section className="card window pay-qr">
          <div className="window__titlebar" aria-hidden="true">
            <span className="window__title">VietQR</span>
          </div>
          <div className="card__body pay-qr__body">
            <div className="pay-qr__image">
              {/* External QR image from the VietQR service; already sized for scanning. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt={t.order.payNow} width={280} height={280} />
            </div>
            <div>
              <h2 className="card__title">{t.order.payNow}</h2>
              <p className="muted small">{t.order.payHint}</p>
              <dl className="specs">
                <div>
                  <dt>{t.order.accountNo}</dt>
                  <dd>
                    {site.bankTransfer.bankId} · {site.bankTransfer.accountNo}
                  </dd>
                </div>
                <div>
                  <dt>{t.order.accountName}</dt>
                  <dd>{site.bankTransfer.accountName}</dd>
                </div>
                <div>
                  <dt>{t.order.amount}</dt>
                  <dd>{money(order.total)}</dd>
                </div>
                <div>
                  <dt>{t.order.memo}</dt>
                  <dd>
                    <code>{order.id}</code>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>
      )}

      <section className="card window">
        <div className="window__titlebar" aria-hidden="true">
          <span className="window__title">{t.order.items}</span>
        </div>
        <div className="card__body">
          <ul className="summary-lines">
            {order.lines.map((line) => (
              <li key={`${line.productId}:${line.skuId}`} className="summary-line">
                <span className="summary-line__media">
                  <ProductImage src={line.image} alt="" sizes="56px" />
                  <span className="summary-line__qty">{line.quantity}</span>
                </span>
                <span className="summary-line__info">
                  <Link href={localePath(lang, `/products/${line.slug}`)}>{line.title}</Link>
                  <span className="muted small">{line.skuName}</span>
                </span>
                <span>{money(line.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="totals">
            <div>
              <dt>{t.cart.subtotal}</dt>
              <dd>{money(order.subtotal)}</dd>
            </div>
            {order.discount ? (
              <div className="totals__discount">
                <dt>
                  {t.cart.discount}
                  {order.voucherCode ? ` (${order.voucherCode})` : ""}
                </dt>
                <dd>−{money(order.discount)}</dd>
              </div>
            ) : null}
            <div>
              <dt>{t.cart.shipping}</dt>
              <dd>{order.shippingFee ? money(order.shippingFee) : t.cart.free}</dd>
            </div>
            <div className="totals__grand">
              <dt>{t.cart.total}</dt>
              <dd>{money(order.total)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="card window">
        <div className="window__titlebar" aria-hidden="true">
          <span className="window__title">{t.order.shipTo}</span>
        </div>
        <div className="card__body">
          <h2 className="card__title">{t.order.shipTo}</h2>
          <address className="address">
            <strong>{order.customer.name}</strong> · {order.customer.phone}
            <br />
            {order.shippingAddress.street}, {order.shippingAddress.ward}, {order.shippingAddress.province}
          </address>
          {order.note && <p className="muted small">“{order.note}”</p>}
        </div>
      </section>

      <p className="center">
        <Link href={localePath(lang, "/shop")} className="btn btn--ghost">
          {t.cart.continue}
        </Link>
      </p>
    </div>
  );
}
