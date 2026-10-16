"use client";

import { useEffect, useState } from "react";
import type { Quote } from "@/lib/checkout/quote";
import type { Locale } from "@/lib/types";
import { cartStore, type CartLine } from "./cart-store";

/**
 * Re-price the cart on the server whenever it changes, and fold authoritative prices and stock
 * back into the stored cart so the drawer and badge stay truthful.
 */
export function useServerQuote(lines: CartLine[], lang: Locale) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState(false);
  const [nonce, setNonce] = useState(0);
  const key = JSON.stringify(lines.map((l) => [l.productId, l.skuId, l.quantity, l.price]));

  useEffect(() => {
    if (lines.length === 0) return;
    const controller = new AbortController();
    fetch("/api/cart/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        locale: lang,
        items: lines.map((l) => ({ productId: l.productId, skuId: l.skuId, quantity: l.quantity, price: l.price })),
      }),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? (res.json() as Promise<Quote>) : Promise.reject(new Error(String(res.status)))))
      .then((q) => {
        setQuote(q);
        setError(false);
        // Sync stored lines with the server's view (price, stock caps, unavailable items).
        const current = cartStore.getSnapshot();
        const next = current.flatMap((line) => {
          const ql = q.lines.find((x) => x.productId === line.productId && x.skuId === line.skuId);
          if (!ql) return [line];
          if (ql.issue === "unavailable") return [line];
          return [{ ...line, price: ql.unitPrice, maxQuantity: ql.available, quantity: Math.min(line.quantity, ql.available) }];
        });
        if (JSON.stringify(next) !== JSON.stringify(current)) cartStore.set(next);
      })
      .catch((e: unknown) => {
        if ((e as Error).name !== "AbortError") setError(true);
      });
    return () => controller.abort();
    // `key` captures the relevant parts of `lines`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, lang, nonce]);

  return { quote: lines.length ? quote : null, error, refresh: () => setNonce((n) => n + 1) };
}
