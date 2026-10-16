import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Exercise the order flow against the local JSON repository in a throwaway directory.
let dir: string;
let orders: typeof import("./orders");
let repo: import("./repo").Repository;

const validInput = () => ({
  locale: "vi",
  items: [{ productId: "seed-stark-chibi", skuId: "seed-stark-chibi-std", quantity: 2 }],
  customer: { name: "Nguyễn Test", phone: "0912 345 678" },
  address: { province: "Thành phố Hồ Chí Minh", ward: "Phường Bến Thành", street: "123 Đường Thử Nghiệm" },
  paymentMethod: "cod",
});

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "anitoy-test-"));
  vi.stubEnv("LOCAL_DATA_DIR", dir);
  vi.stubEnv("DATA_BACKEND", "local");
  vi.resetModules();
  orders = await import("./orders");
  repo = await (await import("./repo")).getRepository();
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

describe("createOrder", () => {
  it("rejects invalid input with the offending fields", async () => {
    await expect(orders.createOrder({ ...validInput(), customer: { name: "A", phone: "123" } }, {})).rejects.toMatchObject({
      code: "invalid",
    });
    await expect(orders.createOrder({ ...validInput(), customer: { name: "Nguyễn", phone: "0212345678" } }, {})).rejects.toMatchObject({
      code: "invalid",
      details: { fields: ["customer.phone"] },
    });
  });

  it("refuses bank transfer when it is not configured", async () => {
    await expect(orders.createOrder({ ...validInput(), paymentMethod: "bank_transfer" }, {})).rejects.toMatchObject({
      code: "invalid",
      details: { fields: ["paymentMethod"] },
    });
  });

  it("places an order, normalises the phone and decrements stock", async () => {
    const order = await orders.createOrder(validInput(), { ip: "203.0.113.1" });
    expect(order.id).toMatch(/^AT[A-Z0-9]{7}$/);
    expect(order.customer.phone).toBe("0912345678");
    expect(order.total).toBe(158000);
    expect(order.shippingFee).toBe(0);
    const product = await repo.getProduct("seed-stark-chibi");
    expect(product?.skus.find((s) => s.id === "seed-stark-chibi-std")?.stock).toBe(2);

    expect(await orders.getOrderForViewer(order.id, order.accessToken)).not.toBeNull();
    expect(await orders.getOrderForViewer(order.id, "wrong-token")).toBeNull();
  });

  it("returns a fresh quote instead of overselling", async () => {
    await expect(
      orders.createOrder({ ...validInput(), items: [{ productId: "seed-stark-chibi", skuId: "seed-stark-chibi-std", quantity: 3 }] }, {}),
    ).rejects.toMatchObject({ code: "quote_changed" });
  });

  it("restocks on cancel and enforces the workflow", async () => {
    const order = await orders.createOrder(validInput(), {});
    expect((await repo.getProduct("seed-stark-chibi"))?.skus[0]?.stock).toBe(0);
    await expect(orders.applyOrderAction(order.id, "deliver")).rejects.toThrow(/cannot/);
    await orders.applyOrderAction(order.id, "cancel");
    expect((await repo.getProduct("seed-stark-chibi"))?.skus[0]?.stock).toBe(2);
    expect(orders.allowedActions((await repo.getOrder(order.id))!)).toEqual([]);
  });
});

describe("local repository", () => {
  it("deduplicates events", async () => {
    expect(await repo.claimEvent("evt-1", 60)).toBe(true);
    expect(await repo.claimEvent("evt-1", 60)).toBe(false);
    expect(await repo.isEventClaimed("evt-1")).toBe(true);
    await repo.releaseEvent("evt-1");
    expect(await repo.claimEvent("evt-1", 60)).toBe(true);
  });
});
