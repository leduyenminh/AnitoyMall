"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from "react";
import { MAX_QTY_PER_LINE } from "@/lib/checkout/quote";
import { trackPixel } from "../analytics/pixel";
import { cartStore, type CartLine } from "./cart-store";

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (line: CartLine, options?: { open?: boolean }) => void;
  setQuantity: (productId: string, skuId: string, quantity: number) => void;
  remove: (productId: string, skuId: string) => void;
  replace: (lines: CartLine[]) => void;
  clear: () => void;
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const same = (a: CartLine, productId: string, skuId: string) => a.productId === productId && a.skuId === skuId;
const cap = (line: CartLine, quantity: number) =>
  Math.max(0, Math.min(quantity, line.maxQuantity, MAX_QTY_PER_LINE));

export function CartProvider({ children }: { children: React.ReactNode }) {
  const lines = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);
  const [isOpen, setOpen] = useState(false);

  const add = useCallback<CartContextValue["add"]>((line, options) => {
    const current = cartStore.getSnapshot();
    const existing = current.find((l) => same(l, line.productId, line.skuId));
    const next = existing
      ? current.map((l) => (same(l, line.productId, line.skuId) ? { ...line, quantity: cap(line, l.quantity + line.quantity) } : l))
      : [...current, { ...line, quantity: cap(line, line.quantity) }];
    cartStore.set(next.filter((l) => l.quantity > 0));
    trackPixel("AddToCart", {
      contents: [{ content_id: line.productId, content_name: line.title, quantity: line.quantity, price: line.price }],
      value: line.price * line.quantity,
    });
    if (options?.open !== false) setOpen(true);
  }, []);

  const setQuantity = useCallback((productId: string, skuId: string, quantity: number) => {
    cartStore.set(
      cartStore
        .getSnapshot()
        .map((l) => (same(l, productId, skuId) ? { ...l, quantity: cap(l, quantity) } : l))
        .filter((l) => l.quantity > 0),
    );
  }, []);

  const remove = useCallback((productId: string, skuId: string) => {
    cartStore.set(cartStore.getSnapshot().filter((l) => !same(l, productId, skuId)));
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      subtotal: lines.reduce((n, l) => n + l.price * l.quantity, 0),
      add,
      setQuantity,
      remove,
      replace: (next) => cartStore.set(next),
      clear: () => cartStore.set([]),
      isOpen,
      open: () => setOpen(true),
      close: () => setOpen(false),
    }),
    [lines, isOpen, add, setQuantity, remove],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
