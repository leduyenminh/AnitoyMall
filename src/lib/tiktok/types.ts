// The subset of TikTok Shop API (202309) payloads this app reads. Fields are optional because the
// API omits empty values; the mapper treats everything defensively.

export interface TtsImage {
  uri?: string;
  urls?: string[];
  thumb_urls?: string[];
  width?: number;
  height?: number;
}

export interface TtsSku {
  id: string;
  seller_sku?: string;
  price?: { currency?: string; sale_price?: string; tax_exclusive_price?: string };
  inventory?: { warehouse_id: string; quantity: number }[];
  sales_attributes?: { name?: string; value_name?: string; sku_img?: TtsImage }[];
}

export interface TtsProductSummary {
  id: string;
  title?: string;
  status?: string;
  update_time?: number;
}

export interface TtsProductDetail {
  id: string;
  title: string;
  description?: string;
  status?: string;
  main_images?: TtsImage[];
  skus?: TtsSku[];
  product_attributes?: { id?: string; name?: string; values?: { name?: string }[] }[];
  create_time?: number;
  update_time?: number;
}

export interface TtsOrder {
  id: string;
  status?: string;
  line_items?: { product_id?: string; sku_id?: string; product_name?: string }[];
}

/** Webhook envelope. Route on `type`; `data` differs per event. */
export interface TtsNotification {
  type: number;
  tts_notification_id: string;
  shop_id?: string;
  timestamp?: number;
  data?: {
    order_id?: string;
    order_status?: string;
    product_id?: string;
    status?: string;
    [key: string]: unknown;
  };
}

/** Webhook event types this app reacts to. */
export const TtsEventType = {
  ORDER_STATUS_CHANGE: 1,
  REVERSE_ORDER_STATUS_CHANGE: 2,
  PRODUCT_STATUS_CHANGE: 5,
  SELLER_DEAUTHORIZATION: 6,
  UPCOMING_AUTHORIZATION_EXPIRATION: 7,
} as const;
