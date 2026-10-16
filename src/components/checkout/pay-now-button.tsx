"use client";

import { useState } from "react";
import { useI18n } from "../i18n";

/** Re-opens the payment gateway for an unpaid online order. */
export function PayNowButton({ orderId, token }: { orderId: string; token: string }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function pay() {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/pay`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json().catch(() => ({}))) as { paymentUrl?: string };
      if (res.ok && data.paymentUrl) {
        window.location.assign(data.paymentUrl);
        return;
      }
      if (res.status === 409) {
        // Already paid or no longer payable: show the current state.
        window.location.reload();
        return;
      }
      setFailed(true);
    } catch {
      setFailed(true);
    }
    setBusy(false);
  }

  return (
    <div className="pay-now">
      <button type="button" className="btn btn--primary" onClick={pay} disabled={busy} aria-busy={busy}>
        {busy ? t.checkout.redirecting : t.order.payNowOnline}
      </button>
      {failed && (
        <p className="field__error" role="alert">
          {t.order.paymentStartFailed}
        </p>
      )}
    </div>
  );
}
