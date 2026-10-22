import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Exercise the order flow against the local JSON repository in a throwaway directory.
let dir: string;
let orders: typeof import("./orders");
let repo: import("./repo").Repository;

// The Frieren / Fern / Stark listing from the seed catalog (79,000 ₫; stock 12 / 8 / 4).
const LISTING = "tt-1731581424295380108";
const FRIEREN = { productId: LISTING, skuId: "seed-frieren-1" };
const FERN = { productId: LISTING, skuId: "seed-frieren-2" };
const STARK = { productId: LISTING, skuId: "seed-frieren-3" };

const validInput = () => ({
  locale: "vi",
  items: [{ ...STARK, quantity: 2 }],
  customer: { name: "Nguyễn Test", phone: "0912 345 678" },
  address: { province: "Thành phố Hồ Chí Minh", ward: "Phường Bến Thành", street: "123 Đường Thử Nghiệm" },
  paymentMethod: "cod",
});

const stockOf = async (sku: { skuId: string }) =>
  (await repo.getProduct(LISTING))?.skus.find((s) => s.id === sku.skuId)?.stock;

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "anitoy-test-"));
  vi.stubEnv("LOCAL_DATA_DIR", dir);
  vi.stubEnv("DATA_BACKEND", "local");
  // A configured ZaloPay merchant switches on the wallet, card and ATM methods.
  vi.stubEnv("ZALOPAY_APP_ID", "2553");
  vi.stubEnv("ZALOPAY_KEY1", "test-key1");
  vi.stubEnv("ZALOPAY_KEY2", "test-key2");
  vi.resetModules();
  orders = await import("./orders");
  repo = await (await import("./repo")).getRepository();
  const stamp = new Date().toISOString();
  await repo.putPromotion({
    id: "test-voucher",
    kind: "voucher",
    channel: "website",
    title: "Giảm 15K",
    code: "TEST15K",
    discountType: "amount",
    discountValue: 15000,
    minSpend: 150000,
    startsAt: "2020-01-01T00:00:00.000Z",
    endsAt: "2099-01-01T00:00:00.000Z",
    active: true,
    createdAt: stamp,
    updatedAt: stamp,
  });
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

  it("refuses payment methods that are not configured", async () => {
    await expect(orders.createOrder({ ...validInput(), paymentMethod: "bank_transfer" }, {})).rejects.toMatchObject({
      code: "invalid",
      details: { fields: ["paymentMethod"] },
    });
    await expect(orders.createOrder({ ...validInput(), paymentMethod: "momo" }, {})).rejects.toMatchObject({
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
    expect(await stockOf(STARK)).toBe(2);

    expect(await orders.getOrderForViewer(order.id, order.accessToken)).not.toBeNull();
    expect(await orders.getOrderForViewer(order.id, "wrong-token")).toBeNull();
  });

  it("returns a fresh quote instead of overselling", async () => {
    await expect(orders.createOrder({ ...validInput(), items: [{ ...STARK, quantity: 3 }] }, {})).rejects.toMatchObject({
      code: "quote_changed",
    });
  });

  it("restocks on cancel and enforces the workflow", async () => {
    const order = await orders.createOrder(validInput(), {});
    expect(await stockOf(STARK)).toBe(0);
    await expect(orders.applyOrderAction(order.id, "deliver")).rejects.toThrow(/cannot/);
    await orders.applyOrderAction(order.id, "cancel");
    expect(await stockOf(STARK)).toBe(2);
    expect(orders.allowedActions((await repo.getOrder(order.id))!)).toEqual([]);
  });

  it("applies a website voucher on the server and records it", async () => {
    const order = await orders.createOrder({ ...validInput(), items: [{ ...FERN, quantity: 2 }], voucherCode: " test15k " }, {});
    expect(order).toMatchObject({ subtotal: 158000, discount: 15000, voucherCode: "TEST15K", shippingFee: 0, total: 143000 });
  });

  it("rejects an unknown or unreachable voucher instead of charging full price silently", async () => {
    await expect(orders.createOrder({ ...validInput(), items: [{ ...FERN, quantity: 1 }], voucherCode: "NOPE" }, {})).rejects.toMatchObject({
      code: "voucher_invalid",
    });
    // Below the minimum spend.
    await expect(orders.createOrder({ ...validInput(), items: [{ ...FERN, quantity: 1 }], voucherCode: "TEST15K" }, {})).rejects.toMatchObject({
      code: "voucher_invalid",
    });
  });
});

describe("online payments", () => {
  const online = () => ({ ...validInput(), items: [{ ...FRIEREN, quantity: 1 }], paymentMethod: "zalopay" });

  it("marks an order paid once, and only for the exact amount", async () => {
    const order = await orders.createOrder(online(), {});
    expect(order.total).toBe(109000); // 79,000 + 30,000 shipping
    expect(orders.isOnlinePayment(order)).toBe(true);

    const base = { provider: "zalopay" as const, ref: `261016_${order.id}_1`, transactionId: "zp-1" };
    expect((await orders.recordOnlinePayment(order.id, { ...base, amount: 1000 })).result).toBe("amount_mismatch");
    expect((await repo.getOrder(order.id))?.paymentStatus).toBe("unpaid");

    expect((await orders.recordOnlinePayment(order.id, { ...base, amount: order.total })).result).toBe("paid");
    expect((await orders.recordOnlinePayment(order.id, { ...base, amount: order.total })).result).toBe("already_paid");
    const paid = await repo.getOrder(order.id);
    expect(paid).toMatchObject({ paymentStatus: "paid", payment: { provider: "zalopay", transactionId: "zp-1" } });
    expect(paid?.history.filter((h) => h.status === "paid")).toHaveLength(1);

    expect((await orders.recordOnlinePayment("ATZZZZZZZ", { ...base, amount: 1 })).result).toBe("not_found");
  });

  it("releases stock held by online orders that were never paid", async () => {
    const before = await stockOf(FRIEREN);
    const unpaid = await orders.createOrder(online(), {});
    const cod = await orders.createOrder({ ...online(), paymentMethod: "cod" }, {});
    expect(await stockOf(FRIEREN)).toBe(before! - 2);

    expect(await orders.expireUnpaidOrders(45)).toEqual([]); // too recent
    const later = new Date(Date.now() + 46 * 60_000);
    const expired = await orders.expireUnpaidOrders(45, later);
    expect(expired).toEqual([unpaid.id]);
    expect((await repo.getOrder(unpaid.id))?.status).toBe("cancelled");
    expect((await repo.getOrder(cod.id))?.status).toBe("pending");
    expect(await stockOf(FRIEREN)).toBe(before! - 1);
  });
});

describe("lookupOrder", () => {
  const placeOrder = () =>
    orders.createOrder(
      {
        ...validInput(),
        items: [{ ...FRIEREN, quantity: 1 }],
        customer: { name: "Nguyễn Test", phone: "0912 345 678", email: "khach@example.vn" },
      },
      {},
    );

  it("finds an order by code and phone, in any common format", async () => {
    const order = await placeOrder();
    const found = await orders.lookupOrder(order.id, "+84 912.345.678");
    expect(found).toMatchObject({
      id: order.id,
      status: "pending",
      total: order.total,
      customer: { name: "Ng***", phone: "09******78" },
      province: "Thành phố Hồ Chí Minh",
    });
    expect((await orders.lookupOrder(` ${order.id.slice(2).toLowerCase()} `, "0912345678"))?.id).toBe(order.id);
  });

  it("never returns the token, address, email or full phone", async () => {
    const order = await placeOrder();
    const text = JSON.stringify(await orders.lookupOrder(order.id, "0912345678"));
    for (const secret of [order.accessToken, "123 Đường Thử Nghiệm", "Phường Bến Thành", "khach@example.vn", "0912345678", "Nguyễn"]) {
      expect(text).not.toContain(secret);
    }
  });

  it("treats a wrong phone, an unknown code and a malformed code alike", async () => {
    const order = await placeOrder();
    expect(await orders.lookupOrder(order.id, "0987654321")).toBeNull();
    expect(await orders.lookupOrder(order.id, "123")).toBeNull();
    expect(await orders.lookupOrder("AT2222222", "0912345678")).toBeNull();
    expect(await orders.lookupOrder("not-an-order", "0912345678")).toBeNull();
  });

  it("masks short names and odd phone numbers", () => {
    expect(orders.maskName("  Lê ")).toBe("L***");
    expect(orders.maskName("Minh")).toBe("Mi***");
    expect(orders.maskPhone("123")).toBe("***");
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
