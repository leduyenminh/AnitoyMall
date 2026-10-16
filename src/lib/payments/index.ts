import { log } from "../log";
import { recordOnlinePayment } from "../orders";
import { getRepository } from "../repo";
import type { Order, PaymentProvider } from "../types";
import { momo, vnpay, zalopay, type VerifiedPayment } from "./gateways";
import { loadPaymentSettings, providerFor } from "./settings";

export { enabledPaymentMethods, loadPaymentSettings, ONLINE_METHODS } from "./settings";

const gateways = { zalopay, momo, vnpay };

export function isPaymentProvider(value: string): value is PaymentProvider {
  return value === "zalopay" || value === "momo" || value === "vnpay";
}

/**
 * Create a payment attempt with the order's gateway and return the URL to send the shopper to.
 * Each attempt gets its own reference (gateways reject reused ones).
 */
export async function startPayment(order: Order, context: { origin: string; ip?: string }): Promise<string> {
  const settings = await loadPaymentSettings();
  const provider = providerFor(order.paymentMethod, settings);
  if (!provider) throw new Error(`No gateway configured for ${order.paymentMethod}`);

  const attempts = (order.payment?.attempts ?? 0) + 1;
  const ref = gateways[provider].ref(order.id, attempts);
  // Record the attempt before calling the gateway: even if the call fails half-way (timeout after
  // the gateway registered it), the next attempt gets a fresh reference.
  const repo = await getRepository();
  const current: Order = { ...order, payment: { provider, ref, attempts }, updatedAt: new Date().toISOString() };
  await repo.saveOrder(current, order.updatedAt);

  const input = {
    order,
    ref,
    method: order.paymentMethod,
    returnUrl: `${context.origin}/api/payments/${provider}/return`,
    notifyUrl: `${context.origin}/api/payments/${provider}/ipn`,
    ip: context.ip,
    lang: order.locale,
  };
  const url =
    provider === "zalopay"
      ? await zalopay.create(settings.zalopay!, input)
      : provider === "momo"
        ? await momo.create(settings.momo!, input)
        : vnpay.create(settings.vnpay!, input);
  log.info("payment.started", { orderId: order.id, provider, ref, amount: order.total });
  return url;
}

/** Verify a gateway's signed result (browser return or server notification). */
export async function verifyPayment(provider: PaymentProvider, params: Record<string, string>, body?: unknown): Promise<VerifiedPayment | null> {
  const settings = await loadPaymentSettings();
  switch (provider) {
    case "zalopay":
      if (!settings.zalopay) return null;
      return body ? zalopay.verifyCallback(settings.zalopay, body as { data?: string; mac?: string }) : zalopay.verifyRedirect(settings.zalopay, params);
    case "momo":
      return settings.momo ? momo.verify(settings.momo, (body as Record<string, string>) ?? params) : null;
    case "vnpay":
      return settings.vnpay ? vnpay.verify(settings.vnpay, params) : null;
  }
}

export const orderIdFromRef = (provider: PaymentProvider, ref: string) => gateways[provider].orderId(ref);

/** Apply a verified, successful payment to its order. Safe to call more than once. */
export async function confirmPayment(provider: PaymentProvider, payment: VerifiedPayment) {
  const orderId = orderIdFromRef(provider, payment.ref);
  if (!orderId) return { result: "not_found" as const };
  return recordOnlinePayment(orderId, { provider, ref: payment.ref, amount: payment.amount, transactionId: payment.transactionId });
}
