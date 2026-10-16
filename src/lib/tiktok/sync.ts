import { invalidatePaths, productPaths } from "../cdn";
import { log } from "../log";
import { mirrorImages } from "../media";
import { getRepository } from "../repo";
import type { Product } from "../types";
import { TikTokShopClient } from "./client";
import { mapTikTokProduct, productChanged } from "./mapper";

export interface SyncResult {
  skipped?: string;
  synced: number;
  changed: number;
  archived: number;
}

async function upsertFromTikTok(client: TikTokShopClient, tiktokProductId: string, existing?: Product) {
  const detail = await client.getProduct(tiktokProductId);
  const images = await mirrorImages(detail.main_images ?? [], existing?.images);
  const product = mapTikTokProduct(detail, existing, images);
  const changed = productChanged(existing, product);
  if (changed) await (await getRepository()).putProduct(product);
  return { product, changed };
}

/** Re-read one listing from TikTok Shop (webhook-driven) and refresh the storefront copy. */
export async function refreshProduct(tiktokProductId: string): Promise<Product | null> {
  const client = await TikTokShopClient.create();
  if (!client) return null;
  const repo = await getRepository();
  const existing = (await repo.listProducts({ includeArchived: true })).find((p) => p.tiktokProductId === tiktokProductId);
  const { product, changed } = await upsertFromTikTok(client, tiktokProductId, existing);
  if (changed) await invalidatePaths(productPaths([product.slug]));
  return product;
}

/**
 * Full catalog reconciliation: pull every active listing, upsert changes, and archive storefront
 * products that are no longer listed. Seed products are archived once the real catalog exists.
 */
export async function syncCatalog(): Promise<SyncResult> {
  const repo = await getRepository();
  const startedAt = new Date().toISOString();
  const state = await repo.getSyncState();

  const client = await TikTokShopClient.create();
  if (!client) return { skipped: "TikTok Shop is not connected", synced: 0, changed: 0, archived: 0 };

  try {
    const existing = await repo.listProducts({ includeArchived: true });
    const byTikTokId = new Map(existing.filter((p) => p.tiktokProductId).map((p) => [p.tiktokProductId!, p]));
    const seen = new Set<string>();
    const changedSlugs: string[] = [];

    let pageToken: string | undefined;
    do {
      const page = await client.searchProducts(pageToken);
      for (const summary of page.products ?? []) {
        seen.add(summary.id);
        try {
          const { product, changed } = await upsertFromTikTok(client, summary.id, byTikTokId.get(summary.id));
          if (changed) changedSlugs.push(product.slug);
        } catch (error) {
          // One bad listing must not block the rest of the catalog.
          log.error("tiktok.sync.product_failed", { productId: summary.id, error: String(error) });
        }
      }
      pageToken = page.next_page_token || undefined;
    } while (pageToken);

    let archived = 0;
    for (const product of existing) {
      if (product.status !== "active") continue;
      const delisted = product.source === "tiktok" && !seen.has(product.tiktokProductId ?? "");
      const replacedSeed = product.source === "seed" && seen.size > 0;
      if (delisted || replacedSeed) {
        await repo.putProduct({ ...product, status: "archived", updatedAt: new Date().toISOString() });
        changedSlugs.push(product.slug);
        archived++;
      }
    }

    if (changedSlugs.length) await invalidatePaths(productPaths(changedSlugs));
    await repo.setSyncState({
      ...state,
      lastRunAt: startedAt,
      lastSuccessAt: new Date().toISOString(),
      lastError: undefined,
      productsSynced: seen.size,
      productsArchived: archived,
    });
    log.info("tiktok.sync.done", { synced: seen.size, changed: changedSlugs.length, archived });
    return { synced: seen.size, changed: changedSlugs.length, archived };
  } catch (error) {
    await repo.setSyncState({ ...state, lastRunAt: startedAt, lastError: String(error) });
    throw error;
  }
}

/**
 * Apply a stock change made on the website to TikTok Shop, so both channels sell from the same
 * inventory. Reads TikTok's current quantity and writes back the adjusted value (TikTok's
 * inventory API sets absolute quantities), then mirrors the result locally.
 */
export async function adjustTikTokInventory(
  lines: { productId: string; tiktokProductId?: string; tiktokSkuId?: string; skuId: string; delta: number }[],
): Promise<void> {
  const relevant = lines.filter((l) => l.tiktokProductId && l.tiktokSkuId && l.delta !== 0);
  if (!relevant.length) return;
  const client = await TikTokShopClient.create();
  if (!client) return;
  const repo = await getRepository();

  const byProduct = new Map<string, typeof relevant>();
  for (const line of relevant) byProduct.set(line.tiktokProductId!, [...(byProduct.get(line.tiktokProductId!) ?? []), line]);

  for (const [tiktokProductId, productLines] of byProduct) {
    const detail = await client.getProduct(tiktokProductId);
    const updates = productLines.flatMap((line) => {
      const sku = detail.skus?.find((s) => s.id === line.tiktokSkuId);
      const warehouse = sku?.inventory?.[0];
      if (!sku || !warehouse) return [];
      const quantity = Math.max(0, warehouse.quantity + line.delta);
      return [{ line, payload: { id: sku.id, inventory: [{ warehouse_id: warehouse.warehouse_id, quantity }] }, quantity }];
    });
    if (!updates.length) continue;
    await client.updateInventory(tiktokProductId, updates.map((u) => u.payload));
    for (const { line, payload, quantity } of updates) {
      const otherWarehouses = (detail.skus?.find((s) => s.id === payload.id)?.inventory ?? [])
        .slice(1)
        .reduce((sum, i) => sum + i.quantity, 0);
      await repo.setSkuStock(line.productId, line.skuId, quantity + otherWarehouses);
    }
  }
}
