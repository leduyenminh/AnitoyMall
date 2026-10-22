"use client";

import { useEffect } from "react";
import { recentOrdersStore, type RecentOrder } from "./recent-orders-store";

/** Adds an opened order to this browser's recent orders (covers links opened from email on another device). */
export function RememberOrder({ order }: { order: RecentOrder }) {
  const { id, token, total, createdAt } = order;
  useEffect(() => {
    recentOrdersStore.remember({ id, token, total, createdAt });
  }, [id, token, total, createdAt]);
  return null;
}
