import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { seedProducts } from "@/data/seed-products";
import { seedPromotions } from "@/data/promotions";
import { seedVideos } from "@/data/tiktok-videos";
import { config } from "../config";
import type { Order, Product, Promotion, SyncState, TikTokVideo } from "../types";
import {
  ConflictError,
  DuplicateOrderError,
  OutOfStockError,
  type Repository,
  type StockLine,
} from "./types";

// Development store: one JSON file under .data/. Every operation re-reads the file so that the
// separate module instances Next creates in dev (pages, route handlers) always agree, and writes
// are serialised through a process-wide lock.

/** Bump when the seed catalog changes shape; older dev stores get the new catalog (orders are kept). */
const STORE_VERSION = 3;

interface StoreFile {
  version: number;
  products: Record<string, Product>;
  videos: Record<string, TikTokVideo>;
  promotions: Record<string, Promotion>;
  orders: Record<string, Order>;
  events: Record<string, number>;
  sync: SyncState;
}

const globalLock = globalThis as unknown as { __anitoyStoreLock?: Promise<unknown> };

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const previous = globalLock.__anitoyStoreLock ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(fn);
  globalLock.__anitoyStoreLock = next;
  return next;
}

const clone = <T>(value: T): T => structuredClone(value);

export class LocalRepository implements Repository {
  private readonly file = path.resolve(config.localDataDir, "store.json");

  private seedCatalog(): Pick<StoreFile, "products" | "videos" | "promotions"> {
    return {
      products: Object.fromEntries(seedProducts.map((p) => [p.id, clone(p)])),
      videos: Object.fromEntries(seedVideos.map((v) => [v.id, clone(v)])),
      promotions: Object.fromEntries(seedPromotions.map((p) => [p.id, clone(p)])),
    };
  }

  private async read(attempt = 0): Promise<StoreFile> {
    try {
      const store = JSON.parse(await readFile(this.file, "utf8")) as StoreFile;
      return store.version === STORE_VERSION ? store : { ...store, ...this.seedCatalog(), version: STORE_VERSION };
    } catch (error) {
      // A concurrent writer on Windows/synced folders can expose a half-written file; retry briefly.
      if (error instanceof SyntaxError && attempt < 3) {
        await new Promise((r) => setTimeout(r, 25 * (attempt + 1)));
        return this.read(attempt + 1);
      }
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      return {
        version: STORE_VERSION,
        ...this.seedCatalog(),
        orders: {},
        events: {},
        sync: {},
      };
    }
  }

  private async write(store: StoreFile): Promise<void> {
    await mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(store, null, 2));
    // Synced folders (OneDrive, Dropbox) can briefly lock the target on Windows; retry the swap.
    for (let attempt = 0; ; attempt++) {
      try {
        await rename(tmp, this.file);
        return;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (attempt >= 5 || (code !== "EPERM" && code !== "EBUSY")) throw error;
        await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
      }
    }
  }

  private mutate<T>(fn: (store: StoreFile) => T): Promise<T> {
    return withLock(async () => {
      const store = await this.read();
      const result = fn(store);
      await this.write(store);
      return result;
    });
  }

  async listProducts({ includeArchived = false } = {}): Promise<Product[]> {
    const store = await this.read();
    return Object.values(store.products).filter((p) => includeArchived || p.status === "active");
  }

  async getProduct(id: string): Promise<Product | null> {
    return (await this.read()).products[id] ?? null;
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    const store = await this.read();
    return Object.values(store.products).find((p) => p.slug === slug) ?? null;
  }

  async getProducts(ids: string[]): Promise<Product[]> {
    const store = await this.read();
    return ids.map((id) => store.products[id]).filter((p): p is Product => Boolean(p));
  }

  putProduct(product: Product): Promise<void> {
    return this.mutate((store) => {
      store.products[product.id] = clone(product);
    });
  }

  setSkuStock(productId: string, skuId: string, stock: number): Promise<void> {
    return this.mutate((store) => {
      const sku = store.products[productId]?.skus.find((s) => s.id === skuId);
      if (sku) sku.stock = Math.max(0, stock);
    });
  }

  restock(lines: StockLine[]): Promise<void> {
    return this.mutate((store) => {
      for (const line of lines) {
        const sku = store.products[line.productId]?.skus.find((s) => s.id === line.skuId);
        if (sku) sku.stock += line.quantity;
      }
    });
  }

  placeOrder(order: Order): Promise<void> {
    return this.mutate((store) => {
      if (store.orders[order.id]) throw new DuplicateOrderError(order.id);
      const short = order.lines.filter((line) => {
        const product = store.products[line.productId];
        const sku = product?.skus.find((s) => s.id === line.skuId);
        return !product || product.status !== "active" || !sku || sku.stock < line.quantity;
      });
      if (short.length) throw new OutOfStockError(short.map((l) => l.productId));
      for (const line of order.lines) {
        const sku = store.products[line.productId]!.skus.find((s) => s.id === line.skuId)!;
        sku.stock -= line.quantity;
      }
      store.orders[order.id] = clone(order);
    });
  }

  async getOrder(id: string): Promise<Order | null> {
    return (await this.read()).orders[id] ?? null;
  }

  async listOrders(limit = 50): Promise<Order[]> {
    const store = await this.read();
    return Object.values(store.orders)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  saveOrder(order: Order, expectedUpdatedAt: string): Promise<void> {
    return this.mutate((store) => {
      if (store.orders[order.id]?.updatedAt !== expectedUpdatedAt) throw new ConflictError(`Order ${order.id} was modified concurrently`);
      store.orders[order.id] = clone(order);
    });
  }

  claimEvent(eventId: string, ttlSeconds: number): Promise<boolean> {
    return this.mutate((store) => {
      const now = Date.now();
      for (const [id, expires] of Object.entries(store.events)) if (expires < now) delete store.events[id];
      if (store.events[eventId]) return false;
      store.events[eventId] = now + ttlSeconds * 1000;
      return true;
    });
  }

  async isEventClaimed(eventId: string): Promise<boolean> {
    const expires = (await this.read()).events[eventId];
    return expires !== undefined && expires > Date.now();
  }

  releaseEvent(eventId: string): Promise<void> {
    return this.mutate((store) => {
      delete store.events[eventId];
    });
  }

  async listVideos(): Promise<TikTokVideo[]> {
    return Object.values((await this.read()).videos);
  }

  async getVideos(ids: string[]): Promise<TikTokVideo[]> {
    const store = await this.read();
    return ids.map((id) => store.videos[id]).filter((v): v is TikTokVideo => Boolean(v));
  }

  putVideos(videos: TikTokVideo[]): Promise<void> {
    return this.mutate((store) => {
      for (const video of videos) store.videos[video.id] = clone(video);
    });
  }

  async listPromotions(): Promise<Promotion[]> {
    return Object.values((await this.read()).promotions);
  }

  putPromotion(promotion: Promotion): Promise<void> {
    return this.mutate((store) => {
      store.promotions[promotion.id] = clone(promotion);
    });
  }

  deletePromotion(id: string): Promise<void> {
    return this.mutate((store) => {
      delete store.promotions[id];
    });
  }

  async getSyncState(): Promise<SyncState> {
    return (await this.read()).sync;
  }

  setSyncState(state: SyncState): Promise<void> {
    return this.mutate((store) => {
      store.sync = state;
    });
  }
}
