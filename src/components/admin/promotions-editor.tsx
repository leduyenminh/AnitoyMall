"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatShortMoney } from "@/lib/money";
import type { Promotion } from "@/lib/types";

// Seller-side editor for campaigns and vouchers. Website vouchers are redeemed at checkout;
// TikTok vouchers are only advertised on the home page and link to the TikTok Shop.

type Draft = {
  id?: string;
  kind: Promotion["kind"];
  channel: Promotion["channel"];
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  code: string;
  discountType: "amount" | "percent";
  discountValue: string;
  maxDiscount: string;
  minSpend: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
};

/** ISO instant → value for <input type="datetime-local"> in Vietnam time (UTC+7, no DST). */
const toVnInput = (iso: string) => new Date(Date.parse(iso) + 7 * 3600_000).toISOString().slice(0, 16);

function blank(): Draft {
  const now = Date.now();
  return {
    kind: "voucher",
    channel: "website",
    title: "",
    titleEn: "",
    description: "",
    descriptionEn: "",
    code: "",
    discountType: "amount",
    discountValue: "",
    maxDiscount: "",
    minSpend: "",
    startsAt: toVnInput(new Date(now).toISOString()),
    endsAt: toVnInput(new Date(now + 7 * 86_400_000).toISOString()),
    active: true,
  };
}

function fromPromotion(p: Promotion): Draft {
  return {
    id: p.id,
    kind: p.kind,
    channel: p.channel,
    title: p.title,
    titleEn: p.titleEn ?? "",
    description: p.description ?? "",
    descriptionEn: p.descriptionEn ?? "",
    code: p.code ?? "",
    discountType: p.discountType ?? "amount",
    discountValue: p.discountValue ? String(p.discountValue) : "",
    maxDiscount: p.maxDiscount ? String(p.maxDiscount) : "",
    minSpend: p.minSpend ? String(p.minSpend) : "",
    startsAt: toVnInput(p.startsAt),
    endsAt: toVnInput(p.endsAt),
    active: p.active,
  };
}

const num = (v: string) => (v.trim() ? Number(v.replace(/[^\d]/g, "")) : undefined);

function state(p: Promotion, now: number): { label: string; tone: string } {
  if (!p.active) return { label: "off", tone: "cancelled" };
  if (now < Date.parse(p.startsAt)) return { label: "scheduled", tone: "pending" };
  if (now > Date.parse(p.endsAt)) return { label: "ended", tone: "cancelled" };
  return { label: "live", tone: "delivered" };
}

function summary(p: Promotion): string {
  const parts: string[] = [];
  if (p.discountType && p.discountValue) {
    parts.push(p.discountType === "percent" ? `−${p.discountValue}%` : `−${formatShortMoney(p.discountValue)}`);
  }
  if (p.maxDiscount) parts.push(`max ${formatShortMoney(p.maxDiscount)}`);
  if (p.minSpend) parts.push(`from ${formatShortMoney(p.minSpend)}`);
  return parts.join(" · ");
}

async function send(url: string, method: "POST" | "DELETE", body: unknown) {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? res.statusText);
}

const dateFmt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });

export function PromotionsEditor({ promotions, now }: { promotions: Promotion[]; now: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string>();
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  const isVoucher = draft?.kind === "voucher";
  const isWebsiteVoucher = isVoucher && draft?.channel === "website";

  function save() {
    if (!draft) return;
    const body = {
      ...(draft.id ? { id: draft.id } : {}),
      kind: draft.kind,
      channel: draft.channel,
      title: draft.title,
      titleEn: draft.titleEn,
      description: draft.description,
      descriptionEn: draft.descriptionEn,
      active: draft.active,
      startsAt: draft.startsAt,
      endsAt: draft.endsAt,
      minSpend: num(draft.minSpend),
      ...(isVoucher
        ? {
            code: draft.code || undefined,
            ...(num(draft.discountValue) ? { discountType: draft.discountType, discountValue: num(draft.discountValue) } : {}),
            maxDiscount: draft.discountType === "percent" ? num(draft.maxDiscount) : undefined,
          }
        : {}),
    };
    start(async () => {
      try {
        await send("/api/admin/promotions", "POST", body);
        setError(undefined);
        setDraft(null);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  function remove(p: Promotion) {
    if (!window.confirm(`Delete “${p.title}”?`)) return;
    start(async () => {
      try {
        await send(`/api/admin/promotions/${encodeURIComponent(p.id)}`, "DELETE", {});
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  const sorted = [...promotions].sort((a, b) => b.endsAt.localeCompare(a.endsAt));

  return (
    <div className="promo-admin">
      {sorted.length === 0 ? (
        <p className="muted">No campaigns or vouchers yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Promotion</th>
                <th scope="col">Where</th>
                <th scope="col">Offer</th>
                <th scope="col">Runs</th>
                <th scope="col">State</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => {
                const s = state(p, now);
                return (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.title}</strong>
                      <br />
                      <span className="small muted">
                        {p.kind}
                        {p.code ? (
                          <>
                            {" · "}
                            <code>{p.code}</code>
                          </>
                        ) : null}
                      </span>
                    </td>
                    <td>{p.channel === "website" ? "Website" : "TikTok Shop"}</td>
                    <td className="small">{summary(p) || "—"}</td>
                    <td className="small">
                      {dateFmt.format(new Date(p.startsAt))}
                      <br />→ {dateFmt.format(new Date(p.endsAt))}
                    </td>
                    <td>
                      <span className={`badge badge--status-${s.tone}`}>{s.label}</span>
                    </td>
                    <td>
                      <div className="order-actions">
                        <button type="button" className="btn btn--sm btn--secondary" disabled={pending} onClick={() => setDraft(fromPromotion(p))}>
                          Edit
                        </button>
                        <button type="button" className="btn btn--sm btn--ghost" disabled={pending} onClick={() => remove(p)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!draft && (
        <div className="admin__actions">
          <button type="button" className="btn btn--primary" onClick={() => setDraft(blank())}>
            New campaign / voucher
          </button>
        </div>
      )}

      {draft && (
        <form
          className="form-grid promo-admin__form"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <h3 className="card__title">{draft.id ? `Edit ${draft.title}` : "New promotion"}</h3>
          <div className="field">
            <label className="label" htmlFor="pr-kind">
              Type
            </label>
            <select id="pr-kind" className="select" value={draft.kind} onChange={(e) => set("kind", e.target.value as Draft["kind"])}>
              <option value="voucher">Voucher</option>
              <option value="campaign">Campaign (headline on the home page)</option>
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="pr-channel">
              Redeemed on
            </label>
            <select id="pr-channel" className="select" value={draft.channel} onChange={(e) => set("channel", e.target.value as Draft["channel"])}>
              <option value="website">This website</option>
              <option value="tiktok">TikTok Shop (shown with a link)</option>
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="pr-title">
              Title (Vietnamese)
            </label>
            <input id="pr-title" className="input" required maxLength={80} value={draft.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="pr-title-en">
              Title (English)
            </label>
            <input id="pr-title-en" className="input" maxLength={80} value={draft.titleEn} onChange={(e) => set("titleEn", e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="pr-desc">
              Short description (Vietnamese)
            </label>
            <input id="pr-desc" className="input" maxLength={200} value={draft.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="pr-desc-en">
              Short description (English)
            </label>
            <input id="pr-desc-en" className="input" maxLength={200} value={draft.descriptionEn} onChange={(e) => set("descriptionEn", e.target.value)} />
          </div>
          {isVoucher && (
            <>
              <div className="field">
                <label className="label" htmlFor="pr-code">
                  Code {isWebsiteVoucher ? "" : "(optional)"}
                </label>
                <input
                  id="pr-code"
                  className="input"
                  required={isWebsiteVoucher}
                  maxLength={20}
                  pattern="[A-Za-z0-9]{3,20}"
                  value={draft.code}
                  onChange={(e) => set("code", e.target.value.toUpperCase())}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="pr-type">
                  Discount
                </label>
                <div className="promo-admin__pair">
                  <select id="pr-type" className="select" value={draft.discountType} onChange={(e) => set("discountType", e.target.value as Draft["discountType"])}>
                    <option value="amount">₫ off</option>
                    <option value="percent">% off</option>
                  </select>
                  <input
                    className="input"
                    inputMode="numeric"
                    aria-label="Discount value"
                    required={isWebsiteVoucher}
                    value={draft.discountValue}
                    onChange={(e) => set("discountValue", e.target.value)}
                    placeholder={draft.discountType === "percent" ? "10" : "15000"}
                  />
                </div>
              </div>
              {draft.discountType === "percent" && (
                <div className="field">
                  <label className="label" htmlFor="pr-max">
                    Max discount (₫)
                  </label>
                  <input id="pr-max" className="input" inputMode="numeric" value={draft.maxDiscount} onChange={(e) => set("maxDiscount", e.target.value)} />
                </div>
              )}
            </>
          )}
          <div className="field">
            <label className="label" htmlFor="pr-min">
              Minimum spend (₫)
            </label>
            <input id="pr-min" className="input" inputMode="numeric" value={draft.minSpend} onChange={(e) => set("minSpend", e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="pr-start">
              Starts (Vietnam time)
            </label>
            <input id="pr-start" className="input" type="datetime-local" required value={draft.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="pr-end">
              Ends (Vietnam time)
            </label>
            <input id="pr-end" className="input" type="datetime-local" required value={draft.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
          </div>
          <label className="check field--full">
            <input type="checkbox" checked={draft.active} onChange={(e) => set("active", e.target.checked)} /> Active
          </label>
          <div className="admin__actions field--full">
            <button type="submit" className="btn btn--primary" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </button>
            <button type="button" className="btn btn--ghost" disabled={pending} onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
