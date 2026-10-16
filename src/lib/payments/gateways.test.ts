import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { Order } from "../types";
import { momo, vnpay, zalopay } from "./gateways";
import { enabledPaymentMethods, providerFor } from "./settings";

// Signatures are recomputed here straight from each provider's documented formula, so a change
// in our encoding (field order, URL encoding, hash) shows up as a failing test.

const sha256 = (key: string, data: string) => createHmac("sha256", key).update(data).digest("hex");
const sha512 = (key: string, data: string) => createHmac("sha512", key).update(data).digest("hex");

const order = { id: "ATABC2345", total: 143000, lines: [], customer: { name: "Test", phone: "0912345678" } } as unknown as Order;

describe("VNPay", () => {
  const settings = { tmnCode: "TESTTMN1", hashSecret: "SECRETVNPAY", payUrl: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html" };

  it("builds a signed payment URL in VND×100 with Vietnam time", () => {
    const url = new URL(
      vnpay.create(
        settings,
        { order, ref: vnpay.ref(order.id, 1), method: "card", returnUrl: "https://shop.test/api/payments/vnpay/return", notifyUrl: "", lang: "vi" },
        new Date("2026-10-16T17:30:00.000Z"),
      ),
    );
    const q = Object.fromEntries(url.searchParams);
    expect(q).toMatchObject({
      vnp_Amount: "14300000",
      vnp_TxnRef: "ATABC234501",
      vnp_BankCode: "INTCARD",
      vnp_CreateDate: "20261017003000",
      vnp_ExpireDate: "20261017010000",
      vnp_Locale: "vn",
    });
    // The documented algorithm: sorted keys, form-encoded values, HMAC-SHA512.
    const { vnp_SecureHash, ...rest } = q;
    const signData = Object.keys(rest)
      .sort()
      .map((k) => `${k}=${encodeURIComponent(rest[k]!).replace(/%20/g, "+")}`)
      .join("&");
    expect(vnp_SecureHash).toBe(sha512(settings.hashSecret, signData));
    expect(vnpay.orderId(q.vnp_TxnRef!)).toBe(order.id);
  });

  it("accepts a correctly signed result and rejects a tampered one", () => {
    const result: Record<string, string> = {
      vnp_Amount: "14300000",
      vnp_BankCode: "NCB",
      vnp_OrderInfo: "Thanh toan don hang ATABC2345 Mall of Anitoy",
      vnp_ResponseCode: "00",
      vnp_TmnCode: settings.tmnCode,
      vnp_TransactionNo: "14123456",
      vnp_TransactionStatus: "00",
      vnp_TxnRef: "ATABC234501",
    };
    const signData = Object.keys(result)
      .sort()
      .map((k) => `${k}=${encodeURIComponent(result[k]!).replace(/%20/g, "+")}`)
      .join("&");
    const signed = { ...result, vnp_SecureHashType: "HmacSHA512", vnp_SecureHash: sha512(settings.hashSecret, signData) };
    expect(vnpay.verify(settings, signed)).toEqual({ ref: "ATABC234501", success: true, amount: 143000, transactionId: "14123456" });
    expect(vnpay.verify(settings, { ...signed, vnp_Amount: "100" })).toBeNull();
    expect(vnpay.verify(settings, { ...signed, vnp_ResponseCode: "24" })).toBeNull();
    expect(vnpay.verify(settings, result)).toBeNull();
  });
});

describe("MoMo", () => {
  const settings = { partnerCode: "MOMOTEST", accessKey: "ACCESS", secretKey: "SECRET", endpoint: "https://test-payment.momo.vn" };
  const ipn = {
    partnerCode: "MOMOTEST",
    orderId: momo.ref(order.id, 2),
    requestId: "ATABC2345-2-1760000000000",
    amount: 143000,
    orderInfo: "Thanh toan don hang ATABC2345 Mall of Anitoy",
    orderType: "momo_wallet",
    transId: 4088878653,
    resultCode: 0,
    message: "Successful.",
    payType: "qr",
    responseTime: 1760000000000,
    extraData: "",
  };
  const raw =
    `accessKey=ACCESS&amount=143000&extraData=&message=Successful.&orderId=ATABC2345-2` +
    `&orderInfo=Thanh toan don hang ATABC2345 Mall of Anitoy&orderType=momo_wallet&partnerCode=MOMOTEST` +
    `&payType=qr&requestId=ATABC2345-2-1760000000000&responseTime=1760000000000&resultCode=0&transId=4088878653`;

  it("verifies the IPN signature and maps the result", () => {
    const signed = { ...ipn, signature: sha256(settings.secretKey, raw) };
    expect(momo.verify(settings, signed)).toEqual({ ref: "ATABC2345-2", success: true, amount: 143000, transactionId: "4088878653" });
    expect(momo.orderId("ATABC2345-2")).toBe(order.id);
    expect(momo.verify(settings, { ...signed, amount: 1000 })).toBeNull();
    expect(momo.verify(settings, { ...ipn })).toBeNull();
  });
});

describe("ZaloPay", () => {
  const settings = { appId: "2553", key1: "KEY1", key2: "KEY2", endpoint: "https://sb-openapi.zalopay.vn" };

  it("verifies the server callback with key2", () => {
    const data = JSON.stringify({ app_id: 2553, app_trans_id: "261017_ATABC2345_1", amount: 143000, zp_trans_id: 240001 });
    expect(zalopay.verifyCallback(settings, { data, mac: sha256(settings.key2, data) })).toEqual({
      ref: "261017_ATABC2345_1",
      success: true,
      amount: 143000,
      transactionId: "240001",
    });
    expect(zalopay.verifyCallback(settings, { data, mac: sha256(settings.key1, data) })).toBeNull();
  });

  it("verifies the browser redirect checksum and reads the status", () => {
    const q = { appid: "2553", apptransid: "261017_ATABC2345_1", pmcid: "38", bankcode: "", amount: "143000", discountamount: "0", status: "1" };
    const checksum = sha256(settings.key2, [q.appid, q.apptransid, q.pmcid, q.bankcode, q.amount, q.discountamount, q.status].join("|"));
    expect(zalopay.verifyRedirect(settings, { ...q, checksum })).toMatchObject({ ref: q.apptransid, success: true, amount: 143000 });
    expect(zalopay.verifyRedirect(settings, { ...q, status: "-49", checksum })).toBeNull();
  });

  it("puts the Vietnam date in front of app_trans_id", () => {
    const ref = zalopay.ref(order.id, 3, new Date("2026-10-16T18:00:00.000Z"));
    expect(ref).toBe("261017_ATABC2345_3");
    expect(zalopay.orderId(ref)).toBe(order.id);
  });
});

describe("payment method availability", () => {
  const vnpaySettings = { vnpay: { tmnCode: "T", hashSecret: "S", payUrl: "https://x" } };
  const zaloSettings = { zalopay: { appId: "1", key1: "a", key2: "b", endpoint: "https://x" } };

  it("offers only COD until a gateway is configured", () => {
    expect(enabledPaymentMethods({})).toEqual(["cod"]);
  });

  it("routes cards and ATM to VNPay first, then ZaloPay's gateway", () => {
    expect(enabledPaymentMethods(vnpaySettings)).toEqual(["cod", "card", "atm"]);
    expect(enabledPaymentMethods(zaloSettings)).toEqual(["cod", "zalopay", "card", "atm"]);
    expect(providerFor("card", { ...vnpaySettings, ...zaloSettings })).toBe("vnpay");
    expect(providerFor("atm", zaloSettings)).toBe("zalopay");
    expect(providerFor("momo", zaloSettings)).toBeUndefined();
  });
});
