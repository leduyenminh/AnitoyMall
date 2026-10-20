import { describe, expect, it } from "vitest";
import { MAX_RECENT_ORDERS, withRecentOrder, type RecentOrder } from "./recent-orders-store";

const order = (n: number, token = "t"): RecentOrder => ({
  id: `AT${String(n).padStart(7, "2")}`,
  token,
  total: 79000,
  createdAt: new Date(Date.UTC(2026, 9, 1, 0, n)).toISOString(),
});

describe("withRecentOrder", () => {
  it("keeps the newest first and one entry per order", () => {
    const list = withRecentOrder(withRecentOrder([], order(1)), order(2));
    expect(list.map((o) => o.id)).toEqual([order(2).id, order(1).id]);
    const updated = withRecentOrder(list, order(1, "new-token"));
    expect(updated).toHaveLength(2);
    expect(updated.find((o) => o.id === order(1).id)?.token).toBe("new-token");
  });

  it(`keeps at most ${MAX_RECENT_ORDERS} orders`, () => {
    let list: RecentOrder[] = [];
    for (let n = 1; n <= MAX_RECENT_ORDERS + 3; n++) list = withRecentOrder(list, order(n));
    expect(list).toHaveLength(MAX_RECENT_ORDERS);
    expect(list[0]!.id).toBe(order(MAX_RECENT_ORDERS + 3).id);
  });
});
