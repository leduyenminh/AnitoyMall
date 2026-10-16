"use client";

import { useEffect } from "react";
import { trackPixel } from "../analytics/pixel";

/**
 * Fires the pixel's PlaceAnOrder once per order. The event id matches the server-side Events API
 * call, so TikTok counts the conversion once even when both arrive.
 */
export function OrderTracker({
  order,
}: {
  order: { id: string; total: number; lines: { id: string; title: string; quantity: number; price: number }[] };
}) {
  useEffect(() => {
    const key = `anitoy.tracked.${order.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // ignore
    }
    trackPixel(
      "PlaceAnOrder",
      {
        contents: order.lines.map((l) => ({ content_id: l.id, content_name: l.title, quantity: l.quantity, price: l.price })),
        value: order.total,
      },
      `${order.id}-PlaceAnOrder`,
    );
  }, [order]);
  return null;
}
