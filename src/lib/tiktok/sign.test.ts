import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { signRequest, verifyWebhookSignature } from "./sign";

const secret = "test-app-secret";

describe("signRequest", () => {
  it("signs secret + path + sorted params + body + secret with HMAC-SHA256", () => {
    const sign = signRequest({
      path: "/product/202309/products/search",
      query: { timestamp: "1700000000", app_key: "abc", shop_cipher: "CIPHER", page_size: "100" },
      body: '{"status":"ACTIVATE"}',
      appSecret: secret,
    });
    const expected = createHmac("sha256", secret)
      .update(
        `${secret}/product/202309/products/search` +
          "app_keyabcpage_size100shop_cipherCIPHERtimestamp1700000000" +
          '{"status":"ACTIVATE"}' +
          secret,
      )
      .digest("hex");
    expect(sign).toBe(expected);
  });

  it("ignores sign and access_token parameters", () => {
    const base = { path: "/authorization/202309/shops", appSecret: secret };
    const a = signRequest({ ...base, query: { app_key: "k", timestamp: "1" } });
    const b = signRequest({ ...base, query: { app_key: "k", timestamp: "1", sign: "x", access_token: "y" } });
    expect(a).toBe(b);
  });

  it("changes when the body changes", () => {
    const base = { path: "/p", query: { app_key: "k", timestamp: "1" }, appSecret: secret };
    expect(signRequest({ ...base, body: "{}" })).not.toBe(signRequest({ ...base, body: '{"a":1}' }));
  });
});

describe("verifyWebhookSignature", () => {
  const rawBody = '{"type":1,"tts_notification_id":"n1","data":{"order_id":"o1"}}';
  const good = createHmac("sha256", secret).update(`app-key${rawBody}`).digest("hex");

  it("accepts the HMAC of app_key + raw body", () => {
    expect(verifyWebhookSignature({ rawBody, signature: good, appKey: "app-key", appSecret: secret })).toBe(true);
  });

  it("rejects tampered bodies, wrong keys and missing signatures", () => {
    expect(verifyWebhookSignature({ rawBody: `${rawBody} `, signature: good, appKey: "app-key", appSecret: secret })).toBe(false);
    expect(verifyWebhookSignature({ rawBody, signature: good, appKey: "other", appSecret: secret })).toBe(false);
    expect(verifyWebhookSignature({ rawBody, signature: null, appKey: "app-key", appSecret: secret })).toBe(false);
    expect(verifyWebhookSignature({ rawBody, signature: "abc", appKey: "app-key", appSecret: secret })).toBe(false);
  });
});
