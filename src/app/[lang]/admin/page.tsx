import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminActions, OrderActions } from "@/components/admin/admin-actions";
import { isLocale, localePath } from "@/i18n/config";
import { totalStock } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { allowedActions } from "@/lib/orders";
import { getRepository } from "@/lib/repo";
import { loadCredentials } from "@/lib/tiktok/credentials";
import { formatViews } from "@/lib/videos";

// Seller back office (protected by the proxy with HTTP Basic auth). Kept deliberately simple:
// TikTok Shop connection, catalog sync, and order fulfilment.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

const dateFmt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ connected?: string; videos?: string; error?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const { connected, videos: videosJustConnected, error } = await searchParams;
  const repo = await getRepository();
  const [creds, sync, orders, products, videos] = await Promise.all([
    loadCredentials({ fresh: true }),
    repo.getSyncState(),
    repo.listOrders(50),
    repo.listProducts({ includeArchived: true }),
    repo.listVideos(),
  ]);
  const videosConnected = Boolean(creds.displayAccessToken);
  const totalVideoViews = videos.reduce((sum, v) => sum + v.views, 0);

  const appConfigured = Boolean(creds.appKey && creds.appSecret && creds.serviceId);
  const isConnected = Boolean(creds.accessToken);
  const active = products.filter((p) => p.status === "active");
  const lowStock = active.filter((p) => totalStock(p) <= 3);
  const pending = orders.filter((o) => o.status === "pending");
  const tokenExpiry = creds.accessTokenExpiresAt ? dateFmt.format(new Date(creds.accessTokenExpiresAt * 1000)) : "—";

  return (
    <div className="container page admin">
      <header className="page__head">
        <h1 className="page__title">Admin · Mall of Anitoy</h1>
        <p className="muted">
          <Link href={localePath(lang, "/")}>← Storefront</Link>
        </p>
      </header>

      {connected && <p className="alert alert--success">TikTok Shop connected.</p>}
      {videosJustConnected && <p className="alert alert--success">TikTok account connected – video view counts are syncing.</p>}
      {error && <p className="alert alert--error">TikTok authorization failed: {error}</p>}

      <div className="admin__stats">
        <div className="stat card window">
          <span className="stat__label">Pending orders</span>
          <span className="stat__value">{pending.length}</span>
        </div>
        <div className="stat card window">
          <span className="stat__label">Active products</span>
          <span className="stat__value">{active.length}</span>
        </div>
        <div className="stat card window">
          <span className="stat__label">Low stock (≤3)</span>
          <span className="stat__value">{lowStock.length}</span>
        </div>
        <div className="stat card window">
          <span className="stat__label">Last sync</span>
          <span className="stat__value stat__value--sm">
            {sync.lastSuccessAt ? dateFmt.format(new Date(sync.lastSuccessAt)) : "never"}
          </span>
        </div>
      </div>

      <section className="card window">
        <div className="window__titlebar" aria-hidden="true">
          <span className="window__title">TikTok Shop</span>
        </div>
        <div className="card__body">
          <h2 className="card__title">TikTok Shop connection</h2>
          <dl className="specs">
            <div>
              <dt>App credentials</dt>
              <dd>{appConfigured ? "Configured" : "Missing – set app key, app secret and service id"}</dd>
            </div>
            <div>
              <dt>Shop</dt>
              <dd>{isConnected ? `${creds.shopName ?? creds.sellerName ?? "Connected"} ${creds.shopRegion ? `(${creds.shopRegion})` : ""}` : "Not connected"}</dd>
            </div>
            <div>
              <dt>Access token expires</dt>
              <dd>{tokenExpiry}</dd>
            </div>
            <div>
              <dt>Last sync</dt>
              <dd>
                {sync.lastRunAt ? dateFmt.format(new Date(sync.lastRunAt)) : "—"}
                {sync.productsSynced !== undefined && ` · ${sync.productsSynced} listings`}
                {sync.lastError && <span className="text-danger"> · {sync.lastError}</span>}
              </dd>
            </div>
          </dl>
          <AdminActions canConnect={appConfigured} isConnected={isConnected} />
        </div>
      </section>

      <section className="card window">
        <div className="window__titlebar" aria-hidden="true">
          <span className="window__title">TikTok videos</span>
        </div>
        <div className="card__body">
          <h2 className="card__title">TikTok videos &amp; view counts</h2>
          <p className="muted small">
            Videos play on the site through TikTok&apos;s official player. Connect the @leduyenminh account (TikTok Login Kit +
            Display API) so view counts and new videos are refreshed with every sync.
          </p>
          <dl className="specs">
            <div>
              <dt>Account</dt>
              <dd>{videosConnected ? `Connected${creds.displayConnectedAt ? ` (${dateFmt.format(new Date(creds.displayConnectedAt))})` : ""}` : "Not connected – showing the snapshot of 16 Oct 2026"}</dd>
            </div>
            <div>
              <dt>Videos</dt>
              <dd>
                {videos.length} · {formatViews(totalVideoViews)} views
              </dd>
            </div>
            <div>
              <dt>Last video sync</dt>
              <dd>
                {sync.videosSyncedAt ? dateFmt.format(new Date(sync.videosSyncedAt)) : "—"}
                {sync.videosError && <span className="text-danger"> · {sync.videosError}</span>}
              </dd>
            </div>
          </dl>
          <div className="admin__actions">
            <a
              className={`btn btn--tiktok${creds.displayClientKey ? "" : " is-disabled"}`}
              href={creds.displayClientKey ? "/api/admin/tiktok/videos/connect" : undefined}
              aria-disabled={!creds.displayClientKey}
            >
              {videosConnected ? "Reconnect TikTok account" : "Connect TikTok account"}
            </a>
            {!creds.displayClientKey && <span className="small muted">Set the Display API client key/secret first.</span>}
          </div>
        </div>
      </section>

      <section className="card window">
        <div className="window__titlebar" aria-hidden="true">
          <span className="window__title">Orders</span>
        </div>
        <div className="card__body">
          <h2 className="card__title">Recent orders</h2>
          {orders.length === 0 ? (
            <p className="muted">No orders yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Order</th>
                    <th scope="col">Placed</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Items</th>
                    <th scope="col">Total</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link href={`${localePath(o.locale, `/order/${o.id}`)}?t=${o.accessToken}`}>
                          <code>{o.id}</code>
                        </Link>
                      </td>
                      <td>{dateFmt.format(new Date(o.createdAt))}</td>
                      <td>
                        {o.customer.name}
                        <br />
                        <a href={`tel:${o.customer.phone}`}>{o.customer.phone}</a>
                        <br />
                        <span className="muted small">
                          {o.shippingAddress.street}, {o.shippingAddress.ward}, {o.shippingAddress.province}
                        </span>
                      </td>
                      <td>
                        {o.lines.map((l) => (
                          <div key={`${l.productId}:${l.skuId}`} className="small">
                            {l.quantity}× {l.title} ({l.skuName})
                          </div>
                        ))}
                      </td>
                      <td>{formatMoney(o.total, "vi", o.currency)}</td>
                      <td>
                        <span className={`badge badge--status-${o.status}`}>{o.status}</span>
                        <br />
                        <span className="small muted">
                          {o.paymentMethod === "cod" ? "COD" : "Bank"} · {o.paymentStatus}
                        </span>
                      </td>
                      <td>
                        <OrderActions orderId={o.id} actions={allowedActions(o)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
