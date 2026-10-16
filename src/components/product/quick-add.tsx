"use client";

import { useCart } from "../cart/cart-context";
import type { CartLine } from "../cart/cart-store";
import { PlusIcon } from "../icons";

export function QuickAdd({ line, label }: { line: CartLine; label: string }) {
  const { add } = useCart();
  return (
    <button type="button" className="icon-btn icon-btn--primary" aria-label={label} title={label} onClick={() => add(line)}>
      <PlusIcon />
    </button>
  );
}
