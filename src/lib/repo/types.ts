import type { Order, Product, SyncState } from "../types";

export interface StockLine {
  productId: string;
  skuId: string;
  quantity: number;
}

/** Raised when an order asks for more units than are available. */
export class OutOfStockError extends Error {
  constructor(public readonly productIds: string[]) {
    super(`Insufficient stock for: ${productIds.join(", ")}`);
    this.name = "OutOfStockError";
  }
}

/** Raised when an order id is already taken (callers retry with a fresh id). */
export class DuplicateOrderError extends Error {
  constructor(id: string) {
    super(`Order ${id} already exists`);
    this.name = "DuplicateOrderError";
  }
}

/** Raised when a change conflicts with the current state (concurrent edit or invalid transition). */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export interface Repository {
  listProducts(options?: { includeArchived?: boolean }): Promise<Product[]>;
  getProduct(id: string): Promise<Product | null>;
  getProductBySlug(slug: string): Promise<Product | null>;
  getProducts(ids: string[]): Promise<Product[]>;
  putProduct(product: Product): Promise<void>;
  /** Set the absolute stock of one SKU (used when TikTok Shop reports its inventory). */
  setSkuStock(productId: string, skuId: string, stock: number): Promise<void>;
  /** Return units to stock, e.g. when an order is cancelled. */
  restock(lines: StockLine[]): Promise<void>;

  /** Create the order and decrement stock for every line in one atomic step. */
  placeOrder(order: Order): Promise<void>;
  getOrder(id: string): Promise<Order | null>;
  listOrders(limit?: number): Promise<Order[]>;
  /** Replace an order, failing with ConflictError if it changed since `expectedUpdatedAt`. */
  saveOrder(order: Order, expectedUpdatedAt: string): Promise<void>;

  /** Record that an event was handled. Returns false if it had already been claimed (dedupe). */
  claimEvent(eventId: string, ttlSeconds: number): Promise<boolean>;
  isEventClaimed(eventId: string): Promise<boolean>;
  /** Undo a claim so a failed event can be processed again on retry. */
  releaseEvent(eventId: string): Promise<void>;
  getSyncState(): Promise<SyncState>;
  setSyncState(state: SyncState): Promise<void>;
}
