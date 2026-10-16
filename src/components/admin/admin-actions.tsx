"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { OrderAction } from "@/lib/orders";

async function post(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
  if (!res.ok) throw new Error(json.error ?? json.message ?? res.statusText);
  return json;
}

export function AdminActions({ canConnect, isConnected }: { canConnect: boolean; isConnected: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string>();

  return (
    <div className="admin__actions">
      <a className={`btn btn--tiktok${canConnect ? "" : " is-disabled"}`} href={canConnect ? "/api/admin/tiktok/connect" : undefined} aria-disabled={!canConnect}>
        {isConnected ? "Reconnect TikTok Shop" : "Connect TikTok Shop"}
      </a>
      <button
        type="button"
        className="btn btn--secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              const res = await post("/api/admin/sync");
              setMessage(res.message ?? "Sync started");
              router.refresh();
            } catch (e) {
              setMessage(`Sync failed: ${(e as Error).message}`);
            }
          })
        }
      >
        {pending ? "Syncing…" : "Sync now"}
      </button>
      {message && (
        <p className="small muted" role="status">
          {message}
        </p>
      )}
    </div>
  );
}

const labels: Record<OrderAction, string> = {
  confirm: "Confirm",
  mark_paid: "Mark paid",
  ship: "Ship",
  deliver: "Delivered",
  cancel: "Cancel",
};

export function OrderActions({ orderId, actions }: { orderId: string; actions: OrderAction[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="order-actions">
      {actions.map((action) => (
        <button
          key={action}
          type="button"
          className={`btn btn--sm ${action === "cancel" ? "btn--ghost" : "btn--secondary"}`}
          disabled={pending}
          onClick={() => {
            if (action === "cancel" && !window.confirm(`Cancel order ${orderId}? Stock will be returned.`)) return;
            start(async () => {
              try {
                await post(`/api/admin/orders/${orderId}`, { action });
                setError(undefined);
                router.refresh();
              } catch (e) {
                setError((e as Error).message);
              }
            });
          }}
        >
          {labels[action]}
        </button>
      ))}
      {error && <span className="small text-danger">{error}</span>}
    </div>
  );
}
