import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * TikTok Shop Open API request signature (API version 202309+):
 *   1. take every query parameter except `sign` and `access_token`, sorted by key
 *   2. concatenate them as `{key}{value}` and prefix the request path
 *   3. append the raw JSON body (omitted for multipart uploads)
 *   4. wrap the string with the app secret on both sides
 *   5. HMAC-SHA256 with the app secret as key, hex encoded
 */
export function signRequest(input: {
  path: string;
  query: Record<string, string>;
  body?: string;
  appSecret: string;
}): string {
  const params = Object.keys(input.query)
    .filter((key) => key !== "sign" && key !== "access_token")
    .sort()
    .map((key) => `${key}${input.query[key]}`)
    .join("");
  const base = `${input.appSecret}${input.path}${params}${input.body ?? ""}${input.appSecret}`;
  return createHmac("sha256", input.appSecret).update(base).digest("hex");
}

/**
 * TikTok Shop webhooks carry `Authorization: hex(HMAC-SHA256(app_secret, app_key + raw_body))`.
 * Always verify against the exact bytes received, before parsing.
 */
export function verifyWebhookSignature(input: {
  rawBody: string;
  signature: string | null;
  appKey: string;
  appSecret: string;
}): boolean {
  if (!input.signature) return false;
  const expected = createHmac("sha256", input.appSecret).update(input.appKey + input.rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(input.signature.trim().toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
