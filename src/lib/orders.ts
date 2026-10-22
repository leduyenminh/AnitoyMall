import { randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { provinces } from "./checkout/provinces";
import { config } from "./config";
import { buildQuote, type Quote } from "./checkout/quote";
import { isOrderCode, isValidEmail, normaliseOrderCode, normalisePhone } from "./checkout/validation";
import { publish } from "./events/publish";
import { log } from "./log";
import { ConflictError, DuplicateOrderError, getRepository, OutOfStockError } from "./repo";
import { enabledPaymentMethods, loadPaymentSettings, ONLINE_METHODS } from "./payments/settings";
import type { Attribution, Order, OrderStatus, PaymentProvider } from "./types";

export const checkoutSchema = z.object({
  locale: z.enum(["vi", "en"]),
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(100),
        skuId: z.string().min(1).max(100),
        quantity: z.number().int().min(1).max(99),
        price: z.number().int().nonnegative().optional(),
      }),
    )
    .min(1)
    .max(50),
  customer: z.object({
    name: z.string().trim().min(2).max(100),
    phone: z.string().trim().min(9).max(20),
    email: z.string().trim().max(200).optional(),
  }),
  address: z.object({
    province: z.enum(provinces),
    ward: z.string().trim().min(2).max(100),
    street: z.string().trim().min(3).max(200),
  }),
  note: z.string().trim().max(500).optional(),
  paymentMethod: z.enum(["cod", "bank_transfer", "zalopay", "momo", "card", "atm"]),
  voucherCode: z.string().trim().max(40).optional(),
  attribution: z
    .object({
      ttclid: z.string().max(500).optional(),
      ttp: z.string().max(500).optional(),
      pageUrl: z.string().max(1000).optional(),
    })
    .optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export class CheckoutError extends Error {
  constructor(
    public readonly code: "invalid" | "quote_changed" | "voucher_invalid",
    public readonly details: { fields?: string[]; quote?: Quote } = {},
  ) {
    super(code);
    this.name = "CheckoutError";
  }
}

// Unambiguous characters (no 0/O, 1/I/L) so customers can read order codes over the phone and
// use them as bank-transfer references.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const newOrderId = () => `AT${Array.from({ length: 7 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")}`;

export async function createOrder(raw: unknown, request: { ip?: string; userAgent?: string }): Promise<Order> {
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    throw new CheckoutError("invalid", { fields: parsed.error.issues.map((i) => i.path.join(".")) });
  }
  const input = parsed.data;
  const phone = normalisePhone(input.customer.phone);
  const email = input.customer.email || undefined;
  const fields: string[] = [];
  if (!phone) fields.push("customer.phone");
  if (email && !isValidEmail(email)) fields.push("customer.email");
  if (!enabledPaymentMethods(await loadPaymentSettings()).includes(input.paymentMethod)) fields.push("paymentMethod");
  if (fields.length) throw new CheckoutError("invalid", { fields });

  const repo = await getRepository();
  const promotions = input.voucherCode ? await repo.listPromotions() : [];
  const quoteFor = async () =>
    buildQuote(input.items, await repo.getProducts(input.items.map((i) => i.productId)), input.locale, {
      voucherCode: input.voucherCode,
      promotions,
    });

  const quote = await quoteFor();
  if (quote.hasIssues || quote.itemCount === 0) throw new CheckoutError("quote_changed", { quote });
  if (quote.voucherIssue) throw new CheckoutError("voucher_invalid", { quote });

  const now = new Date().toISOString();
  const attribution: Attribution = { ...input.attribution, ip: request.ip, userAgent: request.userAgent };
  const order: Order = {
    id: newOrderId(),
    accessToken: randomBytes(18).toString("base64url"),
    status: "pending",
    paymentMethod: input.paymentMethod,
    paymentStatus: "unpaid",
    locale: input.locale,
    customer: { name: input.customer.name, phone: phone!, ...(email ? { email } : {}) },
    shippingAddress: input.address,
    ...(input.note ? { note: input.note } : {}),
    lines: quote.lines.map((l) => ({
      productId: l.productId,
      skuId: l.skuId,
      slug: l.slug,
      title: l.title,
      skuName: l.skuName,
      image: l.image,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      lineTotal: l.lineTotal,
      tiktokProductId: l.tiktokProductId,
      tiktokSkuId: l.tiktokSkuId,
    })),
    currency: quote.currency,
    subtotal: quote.subtotal,
    ...(quote.discount ? { discount: quote.discount, voucherCode: quote.voucher?.code } : {}),
    shippingFee: quote.shippingFee,
    total: quote.total,
    attribution,
    history: [{ status: "pending", at: now }],
    createdAt: now,
    updatedAt: now,
  };

  for (let attempt = 0; ; attempt++) {
    try {
      await repo.placeOrder(order);
      break;
    } catch (error) {
      if (error instanceof DuplicateOrderError && attempt < 3) {
        order.id = newOrderId();
        continue;
      }
      // Someone else bought the last units between quoting and placing: show the fresh quote.
      if (error instanceof OutOfStockError) throw new CheckoutError("quote_changed", { quote: await quoteFor() });
      throw error;
    }
  }

  log.info("order.created", { orderId: order.id, total: order.total, lines: order.lines.length, payment: order.paymentMethod });
  await publish({ type: "order.created", orderId: order.id });
  return order;
}

/** Orders paid through ZaloPay, MoMo or VNPay (as opposed to COD / manual bank transfer). */
export const isOnlinePayment = (order: Pick<Order, "paymentMethod">) => ONLINE_METHODS.includes(order.paymentMethod);

/**
 * Mark an order paid from a verified gateway result. Idempotent: notifications and browser
 * returns can both arrive, and gateways retry.
 */
export async function recordOnlinePayment(
  orderId: string,
  payment: { provider: PaymentProvider; ref: string; amount: number; transactionId?: string },
): Promise<{ result: "paid" | "already_paid" | "not_found" | "amount_mismatch"; order?: Order }> {
  const repo = await getRepository();
  for (let attempt = 0; attempt < 3; attempt++) {
    const order = await repo.getOrder(orderId);
    if (!order) return { result: "not_found" };
    if (order.paymentStatus === "paid") return { result: "already_paid", order };
    if (payment.amount !== order.total) {
      log.warn("payment.amount_mismatch", { orderId, expected: order.total, received: payment.amount, provider: payment.provider });
      return { result: "amount_mismatch", order };
    }
    const now = new Date().toISOString();
    const next: Order = {
      ...order,
      paymentStatus: "paid",
      payment: { provider: payment.provider, ref: payment.ref, attempts: order.payment?.attempts ?? 1, transactionId: payment.transactionId, paidAt: now },
      history: [...order.history, { status: "paid", at: now, note: payment.provider }],
      updatedAt: now,
    };
    try {
      await repo.saveOrder(next, order.updatedAt);
    } catch (error) {
      if (error instanceof ConflictError) continue; // changed meanwhile: re-read and retry
      throw error;
    }
    log.info("payment.confirmed", { orderId, provider: payment.provider, transactionId: payment.transactionId });
    if (order.status === "cancelled") {
      // Money arrived after the unpaid order timed out: the seller must refund or re-open it.
      log.warn("payment.paid_after_cancel", { orderId, provider: payment.provider, transactionId: payment.transactionId });
    }
    await publish({ type: "order.paid", orderId });
    return { result: "paid", order: next };
  }
  throw new ConflictError(`Order ${orderId} kept changing while recording payment`);
}

/** Shoppers can retry an online payment for this long before the order lets its stock go. */
export const ONLINE_PAYMENT_HOLD_MINUTES = 45;

/**
 * When an unpaid order that is still "pending" stops holding stock: online-payment orders after
 * 45 minutes, COD and bank-transfer orders after `holdHours` unless the seller confirms them (or
 * marks a transfer paid) first. Undefined when the order no longer expires.
 */
export function holdExpiresAt(
  order: Pick<Order, "status" | "paymentStatus" | "paymentMethod" | "createdAt">,
  holdHours = config.orders.holdHours,
): Date | undefined {
  if (order.status !== "pending" || order.paymentStatus !== "unpaid") return undefined;
  const minutes = isOnlinePayment(order) ? ONLINE_PAYMENT_HOLD_MINUTES : holdHours * 60;
  return new Date(Date.parse(order.createdAt) + minutes * 60_000);
}

/**
 * Cancel unpaid orders past their hold (see holdExpiresAt), returning their stock to the website
 * and TikTok Shop. Run by the scheduled worker. Without this, orders nobody intends to pay for or
 * receive (mistakes, or a script) would keep stock out of sale on both channels indefinitely.
 */
export async function expireHeldOrders(now = new Date(), holdHours = config.orders.holdHours): Promise<string[]> {
  const repo = await getRepository();
  const shortest = Math.min(ONLINE_PAYMENT_HOLD_MINUTES, holdHours * 60) * 60_000;
  const longest = Math.max(ONLINE_PAYMENT_HOLD_MINUTES, holdHours * 60) * 60_000;
  // Only orders old enough to have expired; the extra week catches any a failed run left behind.
  const createdAfter = new Date(now.getTime() - longest - 7 * 24 * 3600_000).toISOString();
  const createdBefore = new Date(now.getTime() - shortest).toISOString();
  const stale = (await repo.listPendingOrders(createdAfter, createdBefore)).filter((o) => {
    const expires = holdExpiresAt(o, holdHours);
    return expires !== undefined && expires <= now;
  });
  const expired: string[] = [];
  for (const order of stale) {
    try {
      await applyOrderAction(order.id, "cancel", isOnlinePayment(order) ? "payment_timeout" : "not_confirmed");
      expired.push(order.id);
    } catch (error) {
      log.warn("order.expire_failed", { orderId: order.id, error: String(error) });
    }
  }
  if (expired.length) log.info("orders.expired", { orders: expired });
  return expired;
}

/** Orders hold personal data, so viewing one requires the random token from the confirmation link. */
export async function getOrderForViewer(id: string, token: string | undefined): Promise<Order | null> {
  if (!token || !isOrderCode(id)) return null;
  const order = await (await getRepository()).getOrder(id);
  if (!order) return null;
  const a = Buffer.from(order.accessToken);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b) ? order : null;
}

/** What "find my order" shows: status and items, with the contact details masked and no address or token. */
export interface OrderLookup {
  id: string;
  status: OrderStatus;
  paymentMethod: Order["paymentMethod"];
  paymentStatus: Order["paymentStatus"];
  currency: string;
  lines: { slug: string; title: string; skuName: string; image?: string; quantity: number; lineTotal: number }[];
  subtotal: number;
  discount?: number;
  shippingFee: number;
  total: number;
  history: { status: Order["history"][number]["status"]; at: string }[];
  customer: { name: string; phone: string };
  province: string;
  createdAt: string;
}

export function maskName(name: string): string {
  const chars = Array.from(name.trim());
  return `${chars.slice(0, chars.length > 2 ? 2 : 1).join("")}***`;
}

export function maskPhone(phone: string): string {
  return phone.length < 6 ? "***" : `${phone.slice(0, 2)}${"*".repeat(phone.length - 4)}${phone.slice(-2)}`;
}

/**
 * Order lookup by code + phone for shoppers who lost their order link. A wrong code and a wrong
 * phone look the same to the caller, and the result never includes the address, email or token.
 */
export async function lookupOrder(code: string, phoneInput: string): Promise<OrderLookup | null> {
  const id = normaliseOrderCode(code);
  const phone = normalisePhone(phoneInput);
  const order = phone && isOrderCode(id) ? await (await getRepository()).getOrder(id) : null;
  const a = Buffer.from(order?.customer.phone ?? "");
  const b = Buffer.from(phone ?? "");
  if (!order || a.length !== b.length || !timingSafeEqual(a, b)) {
    log.info("order.lookup_failed", { id: id.slice(0, 12) });
    return null;
  }
  return {
    id: order.id,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    currency: order.currency,
    lines: order.lines.map((l) => ({
      slug: l.slug,
      title: l.title,
      skuName: l.skuName,
      ...(l.image ? { image: l.image } : {}),
      quantity: l.quantity,
      lineTotal: l.lineTotal,
    })),
    subtotal: order.subtotal,
    ...(order.discount ? { discount: order.discount } : {}),
    shippingFee: order.shippingFee,
    total: order.total,
    // Seller notes can mention the customer, so only the status changes are shown.
    history: order.history.map((h) => ({ status: h.status, at: h.at })),
    customer: { name: maskName(order.customer.name), phone: maskPhone(order.customer.phone) },
    province: order.shippingAddress.province,
    createdAt: order.createdAt,
  };
}

export type OrderAction = "confirm" | "mark_paid" | "ship" | "deliver" | "cancel";

const transitions: Record<Exclude<OrderAction, "mark_paid">, { from: OrderStatus[]; to: OrderStatus }> = {
  confirm: { from: ["pending"], to: "confirmed" },
  ship: { from: ["pending", "confirmed"], to: "shipped" },
  deliver: { from: ["shipped"], to: "delivered" },
  cancel: { from: ["pending", "confirmed"], to: "cancelled" },
};

export function allowedActions(order: Order): OrderAction[] {
  const actions = (Object.keys(transitions) as (keyof typeof transitions)[]).filter((a) =>
    transitions[a].from.includes(order.status),
  ) as OrderAction[];
  if (order.paymentStatus === "unpaid" && order.status !== "cancelled") actions.push("mark_paid");
  return actions;
}

/** Seller-side order workflow (admin). Uses optimistic locking against concurrent edits. */
export async function applyOrderAction(id: string, action: OrderAction, note?: string): Promise<Order> {
  const repo = await getRepository();
  const order = await repo.getOrder(id);
  if (!order) throw new Error(`Order ${id} not found`);
  if (!allowedActions(order).includes(action)) throw new ConflictError(`Order ${id} cannot "${action}" while ${order.status}`);

  const now = new Date().toISOString();
  const next: Order = { ...order, updatedAt: now, history: [...order.history] };
  let becamePaid = false;

  if (action === "mark_paid") {
    next.paymentStatus = "paid";
    next.history.push({ status: "paid", at: now });
    becamePaid = true;
  } else {
    next.status = transitions[action].to;
    next.history.push({ status: next.status, at: now, ...(note ? { note } : {}) });
    // Cash on delivery is collected when the parcel is delivered.
    if (action === "deliver" && order.paymentMethod === "cod" && order.paymentStatus === "unpaid") {
      next.paymentStatus = "paid";
      becamePaid = true;
    }
  }

  await repo.saveOrder(next, order.updatedAt);

  if (action === "cancel") {
    await repo.restock(order.lines.map((l) => ({ productId: l.productId, skuId: l.skuId, quantity: l.quantity })));
    await publish({ type: "order.cancelled", orderId: id });
  }
  if (becamePaid) await publish({ type: "order.paid", orderId: id });
  log.info("order.updated", { orderId: id, action, status: next.status, payment: next.paymentStatus });
  return next;
}

