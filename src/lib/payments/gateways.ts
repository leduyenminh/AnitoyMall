import { createHmac, timingSafeEqual } from "node:crypto";
import type { Order, PaymentMethod } from "../types";
import type { PaymentSettings } from "./settings";

// Thin clients for the Vietnamese gateways that cover what TikTok Shop VN offers buyers:
//   ZaloPay (wallet + its card/ATM gateway), MoMo (wallet), VNPay (international cards, ATM/NAPAS).
// Each exposes: create a payment and get the URL to send the shopper to, and verify the signed
// result the gateway sends back (browser return and server-to-server notification).

const hmac = (algorithm: "sha256" | "sha512", key: string, data: string) =>
  createHmac(algorithm, key).update(data, "utf8").digest("hex");

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a.toLowerCase());
  const right = Buffer.from(b.toLowerCase());
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Vietnam time (GMT+7) pieces, independent of the server's timezone. */
function vnTime(date: Date) {
  const d = new Date(date.getTime() + 7 * 3600_000);
  const p = (n: number, len = 2) => String(n).padStart(len, "0");
  return {
    yymmdd: `${p(d.getUTCFullYear() % 100)}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}`,
    stamp: `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`,
  };
}

/** Gateway-safe ASCII description (VNPay rejects diacritics and special characters). */
const describe = (order: Order) => `Thanh toan don hang ${order.id} Mall of Anitoy`;

export interface VerifiedPayment {
  /** Our reference for the attempt (contains the order id). */
  ref: string;
  success: boolean;
  amount: number;
  transactionId?: string;
}

export interface CreateInput {
  order: Order;
  ref: string;
  method: PaymentMethod;
  returnUrl: string;
  notifyUrl: string;
  ip?: string;
}

// ------------------------------------------------------------------ ZaloPay

export const zalopay = {
  /** app_trans_id: yymmdd (GMT+7) + "_" + unique id. */
  ref: (orderId: string, attempt: number, now = new Date()) => `${vnTime(now).yymmdd}_${orderId}_${attempt}`,
  orderId: (ref: string) => (ref ?? "").split("_")[1],

  async create(s: NonNullable<PaymentSettings["zalopay"]>, input: CreateInput): Promise<string> {
    const preferred =
      input.method === "card" ? ["international_card"] : input.method === "atm" ? ["domestic_card", "account"] : ["zalopay_wallet"];
    const params = {
      app_id: s.appId,
      app_user: input.order.customer.phone,
      app_trans_id: input.ref,
      app_time: String(Date.now()),
      amount: String(input.order.total),
      item: JSON.stringify(
        input.order.lines.map((l) => ({ itemid: l.skuId, itemname: l.title.slice(0, 100), itemprice: l.unitPrice, itemquantity: l.quantity })),
      ),
      embed_data: JSON.stringify({ redirecturl: input.returnUrl, preferred_payment_method: preferred }),
      description: describe(input.order),
      bank_code: "",
      callback_url: input.notifyUrl,
    };
    const mac = hmac(
      "sha256",
      s.key1,
      [params.app_id, params.app_trans_id, params.app_user, params.amount, params.app_time, params.embed_data, params.item].join("|"),
    );
    const res = await fetch(`${s.endpoint}/v2/create`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ ...params, mac }),
    });
    const json = (await res.json()) as { return_code?: number; return_message?: string; sub_return_message?: string; order_url?: string };
    if (json.return_code !== 1 || !json.order_url) {
      throw new Error(`ZaloPay create failed: ${json.return_message} ${json.sub_return_message ?? ""}`.trim());
    }
    return json.order_url;
  },

  /** Server callback: { data, mac, type }, mac = HMAC-SHA256(key2, data). */
  verifyCallback(s: NonNullable<PaymentSettings["zalopay"]>, body: { data?: string; mac?: string }): VerifiedPayment | null {
    if (!body.data || !body.mac || !safeEqual(hmac("sha256", s.key2, body.data), body.mac)) return null;
    const data = JSON.parse(body.data) as { app_trans_id: string; amount: number; zp_trans_id?: number };
    return { ref: String(data.app_trans_id ?? ""), success: true, amount: Number(data.amount), transactionId: data.zp_trans_id?.toString() };
  },

  /** Browser redirect: checksum = HMAC-SHA256(key2, appid|apptransid|pmcid|bankcode|amount|discountamount|status). */
  verifyRedirect(s: NonNullable<PaymentSettings["zalopay"]>, q: Record<string, string>): VerifiedPayment | null {
    const input = [q.appid, q.apptransid, q.pmcid, q.bankcode, q.amount, q.discountamount, q.status].join("|");
    if (!q.checksum || !safeEqual(hmac("sha256", s.key2, input), q.checksum)) return null;
    return { ref: q.apptransid ?? "", success: q.status === "1", amount: Number(q.amount) };
  },
};

// ------------------------------------------------------------------ MoMo

export const momo = {
  ref: (orderId: string, attempt: number) => `${orderId}-${attempt}`,
  orderId: (ref: string) => (ref ?? "").split("-")[0],

  async create(s: NonNullable<PaymentSettings["momo"]>, input: CreateInput & { lang: "vi" | "en" }): Promise<string> {
    const body = {
      partnerCode: s.partnerCode,
      requestId: `${input.ref}-${Date.now()}`,
      amount: input.order.total,
      orderId: input.ref,
      orderInfo: describe(input.order),
      redirectUrl: input.returnUrl,
      ipnUrl: input.notifyUrl,
      requestType: "captureWallet",
      extraData: "",
      lang: input.lang,
    };
    const raw =
      `accessKey=${s.accessKey}&amount=${body.amount}&extraData=${body.extraData}&ipnUrl=${body.ipnUrl}` +
      `&orderId=${body.orderId}&orderInfo=${body.orderInfo}&partnerCode=${body.partnerCode}` +
      `&redirectUrl=${body.redirectUrl}&requestId=${body.requestId}&requestType=${body.requestType}`;
    const res = await fetch(`${s.endpoint}/v2/gateway/api/create`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, signature: hmac("sha256", s.secretKey, raw) }),
    });
    const json = (await res.json()) as { resultCode?: number; message?: string; payUrl?: string };
    if (json.resultCode !== 0 || !json.payUrl) throw new Error(`MoMo create failed: ${json.resultCode} ${json.message ?? ""}`.trim());
    return json.payUrl;
  },

  /** IPN body and redirect query carry the same signed fields. */
  verify(s: NonNullable<PaymentSettings["momo"]>, p: Record<string, string | number | undefined>): VerifiedPayment | null {
    const v = (k: string) => (p[k] ?? "").toString();
    const raw =
      `accessKey=${s.accessKey}&amount=${v("amount")}&extraData=${v("extraData")}&message=${v("message")}` +
      `&orderId=${v("orderId")}&orderInfo=${v("orderInfo")}&orderType=${v("orderType")}&partnerCode=${v("partnerCode")}` +
      `&payType=${v("payType")}&requestId=${v("requestId")}&responseTime=${v("responseTime")}` +
      `&resultCode=${v("resultCode")}&transId=${v("transId")}`;
    if (!v("signature") || !safeEqual(hmac("sha256", s.secretKey, raw), v("signature"))) return null;
    return { ref: v("orderId"), success: v("resultCode") === "0", amount: Number(v("amount")), transactionId: v("transId") || undefined };
  },
};

// ------------------------------------------------------------------ VNPay

/** VNPay signs the sorted, URL-encoded query (spaces as "+") with HMAC-SHA512. */
function vnpaySignData(params: Record<string, string>): string {
  const enc = (value: string) => encodeURIComponent(value).replace(/%20/g, "+");
  return Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== "")
    .sort()
    .map((k) => `${enc(k)}=${enc(params[k]!)}`)
    .join("&");
}

export const vnpay = {
  /** vnp_TxnRef must be alphanumeric and unique per day. */
  ref: (orderId: string, attempt: number) => `${orderId}${String(attempt).padStart(2, "0")}`,
  orderId: (ref: string) => (ref ?? "").slice(0, 9),

  create(s: NonNullable<PaymentSettings["vnpay"]>, input: CreateInput & { lang: "vi" | "en" }, now = new Date()): string {
    const params: Record<string, string> = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: s.tmnCode,
      vnp_Amount: String(input.order.total * 100),
      vnp_CreateDate: vnTime(now).stamp,
      vnp_ExpireDate: vnTime(new Date(now.getTime() + 30 * 60_000)).stamp,
      vnp_CurrCode: "VND",
      vnp_IpAddr: input.ip ?? "127.0.0.1",
      vnp_Locale: input.lang === "en" ? "en" : "vn",
      vnp_OrderInfo: describe(input.order),
      vnp_OrderType: "other",
      vnp_ReturnUrl: input.returnUrl,
      vnp_TxnRef: input.ref,
      ...(input.method === "card" ? { vnp_BankCode: "INTCARD" } : input.method === "atm" ? { vnp_BankCode: "VNBANK" } : {}),
    };
    const signData = vnpaySignData(params);
    return `${s.payUrl}?${signData}&vnp_SecureHash=${hmac("sha512", s.hashSecret, signData)}`;
  },

  /** Same check for the return URL and the IPN (both are GET with vnp_* params). */
  verify(s: NonNullable<PaymentSettings["vnpay"]>, q: Record<string, string>): VerifiedPayment | null {
    const { vnp_SecureHash: hash, vnp_SecureHashType: _type, ...rest } = q;
    const params = Object.fromEntries(Object.entries(rest).filter(([k]) => k.startsWith("vnp_")));
    if (!hash || !safeEqual(hmac("sha512", s.hashSecret, vnpaySignData(params)), hash)) return null;
    return {
      ref: q.vnp_TxnRef ?? "",
      success: q.vnp_ResponseCode === "00" && q.vnp_TransactionStatus === "00",
      amount: Number(q.vnp_Amount) / 100,
      transactionId: q.vnp_TransactionNo,
    };
  },
};
