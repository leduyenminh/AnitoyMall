import { config } from "../config";
import { ensureFreshToken } from "./auth";
import { saveCredentials, type TikTokCredentials } from "./credentials";
import { signRequest } from "./sign";
import type { TtsOrder, TtsProductDetail, TtsProductSummary } from "./types";

export class TikTokApiError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly requestId?: string,
  ) {
    super(`TikTok Shop API error ${code}: ${message}${requestId ? ` (request ${requestId})` : ""}`);
    this.name = "TikTokApiError";
  }
}

interface Envelope<T> {
  code: number;
  message: string;
  request_id?: string;
  data?: T;
}

type Method = "GET" | "POST" | "PUT" | "DELETE";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Minimal TikTok Shop Partner API client (API version 202309). */
export class TikTokShopClient {
  private constructor(private creds: Required<Pick<TikTokCredentials, "appKey" | "appSecret" | "accessToken">> & TikTokCredentials) {}

  /** A ready client, or null when the app is not configured or the shop is not connected yet. */
  static async create(): Promise<TikTokShopClient | null> {
    const creds = await ensureFreshToken();
    if (!creds.appKey || !creds.appSecret || !creds.accessToken) return null;
    const client = new TikTokShopClient({ ...creds, appKey: creds.appKey, appSecret: creds.appSecret, accessToken: creds.accessToken });
    if (!creds.shopCipher) await client.resolveShop();
    return client;
  }

  /** Look up the authorized shop and remember its cipher (required on every shop-scoped call). */
  async resolveShop(): Promise<void> {
    const data = await this.request<{ shops?: { id: string; name: string; region: string; cipher: string }[] }>(
      "GET",
      "/authorization/202309/shops",
      { shopScoped: false },
    );
    const shop = data.shops?.[0];
    if (!shop) throw new Error("No TikTok Shop is authorized for this app");
    const patch = { shopCipher: shop.cipher, shopId: shop.id, shopName: shop.name, shopRegion: shop.region };
    await saveCredentials(patch);
    this.creds = { ...this.creds, ...patch };
  }

  async request<T>(
    method: Method,
    path: string,
    options: { query?: Record<string, string | number | undefined>; body?: unknown; shopScoped?: boolean } = {},
  ): Promise<T> {
    const body = options.body === undefined ? undefined : JSON.stringify(options.body);
    for (let attempt = 0; ; attempt++) {
      const query: Record<string, string> = {
        app_key: this.creds.appKey,
        timestamp: String(Math.floor(Date.now() / 1000)),
      };
      if (options.shopScoped !== false && this.creds.shopCipher) query.shop_cipher = this.creds.shopCipher;
      for (const [key, value] of Object.entries(options.query ?? {})) {
        if (value !== undefined) query[key] = String(value);
      }
      query.sign = signRequest({ path, query, body, appSecret: this.creds.appSecret });

      const res = await fetch(`${config.tiktok.apiBase}${path}?${new URLSearchParams(query)}`, {
        method,
        headers: { "content-type": "application/json", "x-tts-access-token": this.creds.accessToken },
        body,
      });

      // Back off on throttling and transient server errors.
      if ((res.status === 429 || res.status >= 500) && attempt < 3) {
        await sleep(500 * 2 ** attempt);
        continue;
      }
      const json = (await res.json().catch(() => ({ code: res.status, message: res.statusText }))) as Envelope<T>;
      if (json.code !== 0) throw new TikTokApiError(json.code, json.message, json.request_id);
      return json.data as T;
    }
  }

  searchProducts(pageToken?: string) {
    return this.request<{ products?: TtsProductSummary[]; next_page_token?: string; total_count?: number }>(
      "POST",
      "/product/202309/products/search",
      { query: { page_size: 100, page_token: pageToken }, body: { status: "ACTIVATE" } },
    );
  }

  getProduct(productId: string) {
    return this.request<TtsProductDetail>("GET", `/product/202309/products/${encodeURIComponent(productId)}`);
  }

  updateInventory(productId: string, skus: { id: string; inventory: { warehouse_id: string; quantity: number }[] }[]) {
    return this.request<unknown>("POST", `/product/202309/products/${encodeURIComponent(productId)}/inventory/update`, {
      body: { skus },
    });
  }

  getOrders(orderIds: string[]) {
    return this.request<{ orders?: TtsOrder[] }>("GET", "/order/202309/orders", { query: { ids: orderIds.join(",") } });
  }
}
