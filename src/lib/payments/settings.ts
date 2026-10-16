import { bankTransferEnabled } from "../site";
import type { PaymentMethod, PaymentProvider } from "../types";

// Merchant credentials for the online payment gateways. Locally they come from environment
// variables; on AWS from one Secrets Manager secret (PAYMENTS_SECRET_ARN) with the same keys.
// A method is offered at checkout only when a gateway that can process it is configured.

export interface PaymentSettings {
  zalopay?: { appId: string; key1: string; key2: string; endpoint: string };
  momo?: { partnerCode: string; accessKey: string; secretKey: string; endpoint: string };
  vnpay?: { tmnCode: string; hashSecret: string; payUrl: string };
}

type Raw = Partial<Record<string, string>>;

function fromRaw(r: Raw): PaymentSettings {
  const settings: PaymentSettings = {};
  if (r.ZALOPAY_APP_ID && r.ZALOPAY_KEY1 && r.ZALOPAY_KEY2) {
    settings.zalopay = {
      appId: r.ZALOPAY_APP_ID,
      key1: r.ZALOPAY_KEY1,
      key2: r.ZALOPAY_KEY2,
      endpoint: (r.ZALOPAY_ENDPOINT ?? "https://sb-openapi.zalopay.vn").replace(/\/$/, ""),
    };
  }
  if (r.MOMO_PARTNER_CODE && r.MOMO_ACCESS_KEY && r.MOMO_SECRET_KEY) {
    settings.momo = {
      partnerCode: r.MOMO_PARTNER_CODE,
      accessKey: r.MOMO_ACCESS_KEY,
      secretKey: r.MOMO_SECRET_KEY,
      endpoint: (r.MOMO_ENDPOINT ?? "https://test-payment.momo.vn").replace(/\/$/, ""),
    };
  }
  if (r.VNPAY_TMN_CODE && r.VNPAY_HASH_SECRET) {
    settings.vnpay = {
      tmnCode: r.VNPAY_TMN_CODE,
      hashSecret: r.VNPAY_HASH_SECRET,
      payUrl: r.VNPAY_PAY_URL ?? "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
    };
  }
  return settings;
}

let cached: { value: PaymentSettings; at: number } | undefined;

export async function loadPaymentSettings(): Promise<PaymentSettings> {
  if (cached && Date.now() - cached.at < 5 * 60_000) return cached.value;
  let raw: Raw = process.env;
  const secretArn = process.env.PAYMENTS_SECRET_ARN;
  if (secretArn) {
    const { SecretsManagerClient, GetSecretValueCommand } = await import("@aws-sdk/client-secrets-manager");
    const res = await new SecretsManagerClient({ region: process.env.AWS_REGION }).send(new GetSecretValueCommand({ SecretId: secretArn }));
    raw = { ...process.env, ...(JSON.parse(res.SecretString ?? "{}") as Raw) };
  }
  cached = { value: fromRaw(raw), at: Date.now() };
  return cached.value;
}

/** Which gateway handles an online method: VNPay for cards/ATM when available, else ZaloPay's gateway. */
export function providerFor(method: PaymentMethod, s: PaymentSettings): PaymentProvider | undefined {
  switch (method) {
    case "zalopay":
      return s.zalopay ? "zalopay" : undefined;
    case "momo":
      return s.momo ? "momo" : undefined;
    case "card":
    case "atm":
      return s.vnpay ? "vnpay" : s.zalopay ? "zalopay" : undefined;
    default:
      return undefined;
  }
}

export const ONLINE_METHODS: PaymentMethod[] = ["zalopay", "momo", "card", "atm"];

/** Methods to offer at checkout, in display order. */
export function enabledPaymentMethods(s: PaymentSettings): PaymentMethod[] {
  return [
    "cod",
    ...(bankTransferEnabled ? (["bank_transfer"] as const) : []),
    ...ONLINE_METHODS.filter((m) => providerFor(m, s)),
  ];
}
