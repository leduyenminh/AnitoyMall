export type Locale = "vi" | "en";

export interface ProductAttribute {
  name: string;
  value: string;
}

/** Translations layered over a product's primary (Vietnamese) content. */
export interface LocalizedContent {
  title?: string;
  description?: string;
  attributes?: ProductAttribute[];
  /** SKU display names keyed by SKU id. */
  skuNames?: Record<string, string>;
}

export interface Sku {
  id: string;
  name: string;
  /** Price in minor units of the store currency (for VND, whole đồng). */
  price: number;
  /** Reference price shown struck through; only set when it is a real, verifiable price. */
  compareAtPrice?: number;
  stock: number;
  sellerSku?: string;
  image?: string;
  tiktokSkuId?: string;
  tiktokWarehouseId?: string;
}

export type ProductStatus = "active" | "archived";

export interface Product {
  id: string;
  slug: string;
  title: string;
  /** Plain text; paragraphs separated by blank lines. */
  description: string;
  i18n?: Partial<Record<Locale, LocalizedContent>>;
  images: string[];
  /** Collection slug, e.g. "frieren". */
  collection: string;
  /** Category slug, e.g. "mini-10cm". */
  category: string;
  tags: string[];
  attributes: ProductAttribute[];
  skus: Sku[];
  tiktokProductId?: string;
  /** The listing's public TikTok Shop page, when known. */
  tiktokUrl?: string;
  /** TikTok videos that showcase this product (embedded as social proof). */
  tiktokVideoIds: string[];
  /** Merchandising weight; higher sorts first under "Featured". */
  featured: number;
  status: ProductStatus;
  source: "seed" | "tiktok";
  rating?: { value: number; count: number };
  createdAt: string;
  updatedAt: string;
}

/** A video on the shop's TikTok account. Played on the site through TikTok's own embed player. */
export interface TikTokVideo {
  id: string;
  title: string;
  /** View count reported by TikTok (refreshed by the video sync). */
  views: number;
  likes?: number;
  /** Portrait cover (9:16), served from our own storage. */
  cover: string;
  pinned?: boolean;
  createdAt?: string;
  updatedAt: string;
}

/**
 * A running campaign or a voucher. Website vouchers carry a code that applies at checkout here;
 * TikTok vouchers are shown for information and claimed on TikTok Shop.
 */
export interface Promotion {
  id: string;
  kind: "campaign" | "voucher";
  channel: "website" | "tiktok";
  title: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  code?: string;
  discountType?: "amount" | "percent";
  /** VND for "amount", 1–100 for "percent". */
  discountValue?: number;
  /** Cap for percentage vouchers, VND. */
  maxDiscount?: number;
  /** Minimum merchandise subtotal, VND. */
  minSpend?: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
/** Mirrors what TikTok Shop VN offers buyers (PayLater and TikTok balance only exist inside TikTok). */
export type PaymentMethod = "cod" | "bank_transfer" | "zalopay" | "momo" | "card" | "atm";
export type PaymentProvider = "zalopay" | "momo" | "vnpay";
export type PaymentStatus = "unpaid" | "paid";

export interface OrderLine {
  productId: string;
  skuId: string;
  slug: string;
  title: string;
  skuName: string;
  image?: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  tiktokProductId?: string;
  tiktokSkuId?: string;
}

export interface Address {
  province: string;
  ward: string;
  street: string;
}

export interface Customer {
  name: string;
  phone: string;
  email?: string;
}

/** Signals forwarded to the TikTok Events API so ad conversions can be attributed. */
export interface Attribution {
  ttclid?: string;
  ttp?: string;
  ip?: string;
  userAgent?: string;
  pageUrl?: string;
}

export interface Order {
  id: string;
  /** Random secret required to view the order page (orders contain personal data). */
  accessToken: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  locale: Locale;
  customer: Customer;
  shippingAddress: Address;
  note?: string;
  lines: OrderLine[];
  currency: string;
  subtotal: number;
  /** Voucher discount, VND (absent on orders placed before vouchers existed). */
  discount?: number;
  voucherCode?: string;
  shippingFee: number;
  total: number;
  /** Online payment through a gateway (ZaloPay, MoMo, VNPay). */
  payment?: {
    provider: PaymentProvider;
    /** Reference sent to the gateway for the latest attempt. */
    ref: string;
    attempts: number;
    transactionId?: string;
    paidAt?: string;
  };
  attribution?: Attribution;
  history: { status: OrderStatus | "paid"; at: string; note?: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface CartItemInput {
  productId: string;
  skuId: string;
  quantity: number;
}

export interface SyncState {
  lastRunAt?: string;
  lastSuccessAt?: string;
  lastError?: string;
  productsSynced?: number;
  productsArchived?: number;
  videosSyncedAt?: string;
  videosSynced?: number;
  videosError?: string;
}
