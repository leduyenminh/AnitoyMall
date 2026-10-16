// Cart lines persist in localStorage (no account or cookie needed, pages stay CDN-cacheable).
// Prices here are display snapshots only; the server re-prices every cart before an order.

export interface CartLine {
  productId: string;
  skuId: string;
  quantity: number;
  /** Snapshot for instant rendering; refreshed from /api/cart/quote. */
  price: number;
  title: string;
  skuName: string;
  slug: string;
  image?: string;
  /** Stock known when added; caps the quantity stepper. */
  maxQuantity: number;
}

const KEY = "anitoy.cart.v1";
const EMPTY: CartLine[] = [];
const listeners = new Set<() => void>();
let lines: CartLine[] | undefined;

function parse(raw: string | null): CartLine[] {
  try {
    const value = JSON.parse(raw ?? "[]");
    return Array.isArray(value) ? value.filter((l) => l && typeof l.productId === "string" && l.quantity > 0) : [];
  } catch {
    return [];
  }
}

function load(): CartLine[] {
  if (lines) return lines;
  try {
    lines = parse(localStorage.getItem(KEY));
  } catch {
    lines = [];
  }
  // Keep tabs in sync.
  window.addEventListener("storage", (event) => {
    if (event.key !== KEY) return;
    lines = parse(event.newValue);
    listeners.forEach((l) => l());
  });
  return lines;
}

export const cartStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => load(),
  getServerSnapshot: () => EMPTY,
  set(next: CartLine[]) {
    lines = next;
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Storage full or disabled: the cart still works for this session.
    }
    listeners.forEach((l) => l());
  },
};
