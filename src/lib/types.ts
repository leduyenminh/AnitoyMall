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

export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
export type PaymentMethod = "cod" | "bank_transfer";
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
  shippingFee: number;
  total: number;
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
}
