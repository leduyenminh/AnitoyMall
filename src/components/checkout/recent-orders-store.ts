// Orders placed or opened in this browser, so shoppers can find them again without an account.
// Only the order code, its access token, the total and the date are kept: no name, phone or address.

export interface RecentOrder {
  id: string;
  token: string;
  total: number;
  createdAt: string;
}

export const MAX_RECENT_ORDERS = 10;

const KEY = "anitoy.orders.v1";
const EMPTY: RecentOrder[] = [];
const listeners = new Set<() => void>();
let orders: RecentOrder[] | undefined;

/** Newest first, one entry per order, at most MAX_RECENT_ORDERS. */
export function withRecentOrder(list: RecentOrder[], entry: RecentOrder): RecentOrder[] {
  return [entry, ...list.filter((o) => o.id !== entry.id)]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_RECENT_ORDERS);
}

function parse(raw: string | null): RecentOrder[] {
  try {
    const value = JSON.parse(raw ?? "[]");
    return Array.isArray(value)
      ? value.filter((o) => o && typeof o.id === "string" && typeof o.token === "string" && typeof o.createdAt === "string")
      : [];
  } catch {
    return [];
  }
}

function load(): RecentOrder[] {
  if (orders) return orders;
  try {
    orders = parse(localStorage.getItem(KEY));
  } catch {
    orders = [];
  }
  // Keep tabs in sync.
  window.addEventListener("storage", (event) => {
    if (event.key !== KEY) return;
    orders = parse(event.newValue);
    listeners.forEach((l) => l());
  });
  return orders;
}

export const recentOrdersStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => load(),
  getServerSnapshot: () => EMPTY,
  remember(entry: RecentOrder) {
    const current = load();
    const existing = current.find((o) => o.id === entry.id);
    if (existing && existing.token === entry.token && existing.total === entry.total) return;
    orders = withRecentOrder(current, entry);
    try {
      localStorage.setItem(KEY, JSON.stringify(orders));
    } catch {
      // Storage full or disabled: the order link still works for this visit.
    }
    listeners.forEach((l) => l());
  },
};
