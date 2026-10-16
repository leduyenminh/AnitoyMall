// Public, build-time configuration (NEXT_PUBLIC_* values are inlined into the client bundle).
// Server-only settings live in ./config.ts.

const num = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && value !== "" && value !== undefined ? parsed : fallback;
};

export const site = {
  name: "Mall of Anitoy",
  shortName: "Anitoy",
  /** The shop's TikTok bio. */
  tagline: "You will have good time here",
  /**
   * Public origin for absolute URLs (canonical links, sitemap, emails). Resolved at runtime on the
   * server: SITE_URL when deployed with a custom domain, otherwise filled in by the proxy from the
   * CloudFront host on first request.
   */
  get url(): string {
    return (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  },
  tiktok: {
    handle: "leduyenminh",
    profileUrl: "https://www.tiktok.com/@leduyenminh",
    /** Where "Shop on TikTok" sends buyers when a product has no TikTok Shop listing id yet. */
    shopUrl: process.env.NEXT_PUBLIC_TIKTOK_SHOP_URL ?? "https://www.tiktok.com/@leduyenminh",
    /** `{id}` is replaced with the TikTok Shop product id. */
    productUrlTemplate:
      process.env.NEXT_PUBLIC_TIKTOK_PRODUCT_URL_TEMPLATE ??
      "https://shop.tiktok.com/view/product/{id}?region=VN&locale=vi-VN",
    /** Social proof shown on the home page. Update as the account grows. */
    likesLabel: process.env.NEXT_PUBLIC_TIKTOK_LIKES_LABEL ?? "16K+",
  },
  currency: process.env.NEXT_PUBLIC_CURRENCY ?? "VND",
  shipping: {
    flatFee: num(process.env.NEXT_PUBLIC_SHIPPING_FEE, 30000),
    freeThreshold: num(process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD, 150000),
    /** Typical delivery window in days, shown on product pages. */
    etaDays: process.env.NEXT_PUBLIC_DELIVERY_ETA ?? "2–5",
  },
  contact: {
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
    phone: process.env.NEXT_PUBLIC_CONTACT_PHONE,
    zalo: process.env.NEXT_PUBLIC_CONTACT_ZALO,
  },
  pixelId: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID,
  /**
   * Bank account that receives VietQR transfers. These are shown to every paying customer, so they
   * are public by nature. Bank transfer is offered at checkout only when all three are set.
   */
  bankTransfer: {
    bankId: process.env.NEXT_PUBLIC_VIETQR_BANK_ID,
    accountNo: process.env.NEXT_PUBLIC_VIETQR_ACCOUNT_NO,
    accountName: process.env.NEXT_PUBLIC_VIETQR_ACCOUNT_NAME,
  },
};

export const bankTransferEnabled = Boolean(
  site.bankTransfer.bankId && site.bankTransfer.accountNo && site.bankTransfer.accountName,
);

/** VietQR quick-link image: a QR any Vietnamese banking app can scan, prefilled with amount and memo. */
export function vietQrImageUrl(amount: number, memo: string): string | undefined {
  const { bankId, accountNo, accountName } = site.bankTransfer;
  if (!bankId || !accountNo || !accountName) return undefined;
  const params = new URLSearchParams({ amount: String(amount), addInfo: memo, accountName });
  return `https://img.vietqr.io/image/${encodeURIComponent(bankId)}-${encodeURIComponent(accountNo)}-compact2.png?${params}`;
}

export function tiktokProductUrl(tiktokProductId: string | undefined, tiktokUrl?: string): string {
  if (tiktokUrl) return tiktokUrl;
  return tiktokProductId
    ? site.tiktok.productUrlTemplate.replace("{id}", encodeURIComponent(tiktokProductId))
    : site.tiktok.shopUrl;
}

export function tiktokVideoUrl(videoId: string): string {
  return `${site.tiktok.profileUrl}/video/${videoId}`;
}
