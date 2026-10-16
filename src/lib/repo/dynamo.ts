import { DynamoDBClient, TransactionCanceledException } from "@aws-sdk/client-dynamodb";
import {
  BatchGetCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
  type BatchGetCommandOutput,
  type TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { config } from "../config";
import type { Order, Product, Promotion, Sku, SyncState, TikTokVideo } from "../types";
import {
  ConflictError,
  DuplicateOrderError,
  OutOfStockError,
  type Repository,
  type StockLine,
} from "./types";

// Single-table design:
//   Product  PK=PRODUCT#<id>  SK=PRODUCT  GSI1PK=PRODUCT  GSI1SK=<slug>        (list + slug lookup)
//   Order    PK=ORDER#<id>    SK=ORDER    GSI1PK=ORDER    GSI1SK=<createdAt>   (newest first)
//   Video    PK=VIDEO#<id>    SK=VIDEO    GSI1PK=VIDEO    GSI1SK=<id>          (TikTok covers + views)
//   Promo    PK=PROMO#<id>    SK=PROMO    GSI1PK=PROMO    GSI1SK=<endsAt>      (campaigns, vouchers)
//   Event    PK=EVENT#<id>    SK=EVENT    expiresAt=<epoch seconds>            (webhook dedupe, TTL)
//   Sync     PK=SYNC#tiktok   SK=STATE
//
// SKUs are stored as a map keyed by SKU id so a single conditional update can decrement stock
// for several SKUs of the same product atomically.

type SkuMap = Record<string, Sku & { position: number }>;
type ProductItem = Omit<Product, "skus"> & { skus: SkuMap };

const GSI1 = "GSI1";
const isConditionalFailure = (error: unknown) =>
  (error as { name?: string })?.name === "ConditionalCheckFailedException";

function toItem(p: Product): Record<string, unknown> {
  const skus: SkuMap = {};
  p.skus.forEach((sku, position) => (skus[sku.id] = { ...sku, position }));
  return { PK: `PRODUCT#${p.id}`, SK: "PRODUCT", GSI1PK: "PRODUCT", GSI1SK: p.slug, ...p, skus };
}

function fromItem(item: Record<string, unknown>): Product {
  const { PK: _pk, SK: _sk, GSI1PK: _g1, GSI1SK: _g2, skus, ...rest } = item as ProductItem & Record<string, unknown>;
  const ordered = Object.values(skus ?? {})
    .sort((a, b) => a.position - b.position)
    .map(({ position: _position, ...sku }) => sku);
  return { ...(rest as unknown as Omit<Product, "skus">), skus: ordered };
}

const stripKeys = <T>({ PK: _pk, SK: _sk, GSI1PK: _g1, GSI1SK: _g2, ...rest }: Record<string, unknown>) =>
  rest as unknown as T;

function orderItem(order: Order): Record<string, unknown> {
  return { PK: `ORDER#${order.id}`, SK: "ORDER", GSI1PK: "ORDER", GSI1SK: order.createdAt, ...order };
}

function fromOrderItem(item: Record<string, unknown>): Order {
  const { PK: _pk, SK: _sk, GSI1PK: _g1, GSI1SK: _g2, ...order } = item;
  return order as unknown as Order;
}

/** Build one conditional stock update per product (DynamoDB allows one action per item per transaction). */
function stockUpdates(lines: StockLine[], direction: -1 | 1, now: string) {
  const byProduct = new Map<string, StockLine[]>();
  for (const line of lines) byProduct.set(line.productId, [...(byProduct.get(line.productId) ?? []), line]);

  return [...byProduct.entries()].map(([productId, productLines]) => {
    const names: Record<string, string> = { "#skus": "skus", "#stock": "stock", "#updatedAt": "updatedAt" };
    const values: Record<string, unknown> = { ":now": now };
    const sets: string[] = [];
    const conditions: string[] = [];
    productLines.forEach((line, i) => {
      names[`#s${i}`] = line.skuId;
      values[`:q${i}`] = line.quantity;
      const path = `#skus.#s${i}.#stock`;
      sets.push(`${path} = ${path} ${direction < 0 ? "-" : "+"} :q${i}`);
      conditions.push(direction < 0 ? `${path} >= :q${i}` : `attribute_exists(${path})`);
    });
    if (direction < 0) {
      names["#status"] = "status";
      values[":active"] = "active";
      conditions.push("#status = :active");
    }
    return {
      productId,
      Update: {
        TableName: config.aws.tableName,
        Key: { PK: `PRODUCT#${productId}`, SK: "PRODUCT" },
        UpdateExpression: `SET ${sets.join(", ")}, #updatedAt = :now`,
        ConditionExpression: conditions.join(" AND "),
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      },
    };
  });
}

export class DynamoRepository implements Repository {
  private readonly table = config.aws.tableName;
  private readonly db = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: config.aws.region, endpoint: config.aws.dynamoEndpoint }),
    { marshallOptions: { removeUndefinedValues: true } },
  );

  private async queryAll(input: ConstructorParameters<typeof QueryCommand>[0]) {
    const items: Record<string, unknown>[] = [];
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    do {
      const page = await this.db.send(new QueryCommand({ ...input, ExclusiveStartKey }));
      items.push(...(page.Items ?? []));
      ExclusiveStartKey = page.LastEvaluatedKey;
    } while (ExclusiveStartKey);
    return items;
  }

  async listProducts({ includeArchived = false } = {}): Promise<Product[]> {
    const items = await this.queryAll({
      TableName: this.table,
      IndexName: GSI1,
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": "PRODUCT" },
    });
    return items.map(fromItem).filter((p) => includeArchived || p.status === "active");
  }

  async getProduct(id: string): Promise<Product | null> {
    const res = await this.db.send(
      new GetCommand({ TableName: this.table, Key: { PK: `PRODUCT#${id}`, SK: "PRODUCT" } }),
    );
    return res.Item ? fromItem(res.Item) : null;
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    const res = await this.db.send(
      new QueryCommand({
        TableName: this.table,
        IndexName: GSI1,
        KeyConditionExpression: "GSI1PK = :pk AND GSI1SK = :slug",
        ExpressionAttributeValues: { ":pk": "PRODUCT", ":slug": slug },
        Limit: 1,
      }),
    );
    return res.Items?.[0] ? fromItem(res.Items[0]) : null;
  }

  /** BatchGet in chunks of 100, retrying unprocessed keys (throttling) a few times. */
  private async batchGet(keys: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
    const found: Record<string, unknown>[] = [];
    for (let i = 0; i < keys.length; i += 100) {
      let pending: Record<string, unknown>[] | undefined = keys.slice(i, i + 100);
      for (let attempt = 0; pending?.length && attempt < 5; attempt++) {
        const res: BatchGetCommandOutput = await this.db.send(
          new BatchGetCommand({ RequestItems: { [this.table]: { Keys: pending } } }),
        );
        found.push(...(res.Responses?.[this.table] ?? []));
        pending = res.UnprocessedKeys?.[this.table]?.Keys;
      }
    }
    return found;
  }

  async getProducts(ids: string[]): Promise<Product[]> {
    const items = await this.batchGet([...new Set(ids)].map((id) => ({ PK: `PRODUCT#${id}`, SK: "PRODUCT" })));
    return items.map(fromItem);
  }

  async putProduct(product: Product): Promise<void> {
    await this.db.send(new PutCommand({ TableName: this.table, Item: toItem(product) }));
  }

  async setSkuStock(productId: string, skuId: string, stock: number): Promise<void> {
    try {
      await this.db.send(
        new UpdateCommand({
          TableName: this.table,
          Key: { PK: `PRODUCT#${productId}`, SK: "PRODUCT" },
          UpdateExpression: "SET #skus.#sku.#stock = :stock, #updatedAt = :now",
          ConditionExpression: "attribute_exists(#skus.#sku)",
          ExpressionAttributeNames: { "#skus": "skus", "#sku": skuId, "#stock": "stock", "#updatedAt": "updatedAt" },
          ExpressionAttributeValues: { ":stock": Math.max(0, stock), ":now": new Date().toISOString() },
        }),
      );
    } catch (error) {
      if (!isConditionalFailure(error)) throw error;
    }
  }

  async restock(lines: StockLine[]): Promise<void> {
    const now = new Date().toISOString();
    for (const { Update } of stockUpdates(lines, 1, now)) {
      try {
        await this.db.send(new UpdateCommand(Update));
      } catch (error) {
        // The SKU no longer exists (product re-synced); nothing to return stock to.
        if (!isConditionalFailure(error)) throw error;
      }
    }
  }

  async placeOrder(order: Order): Promise<void> {
    const updates = stockUpdates(order.lines, -1, order.createdAt);
    const input: TransactWriteCommandInput = {
      TransactItems: [
        {
          Put: {
            TableName: this.table,
            Item: orderItem(order),
            ConditionExpression: "attribute_not_exists(PK)",
          },
        },
        ...updates.map(({ Update }) => ({ Update })),
      ],
    };
    try {
      await this.db.send(new TransactWriteCommand(input));
    } catch (error) {
      if (!(error instanceof TransactionCanceledException)) throw error;
      const reasons = error.CancellationReasons ?? [];
      if (reasons[0]?.Code === "ConditionalCheckFailed") throw new DuplicateOrderError(order.id);
      const short = updates
        .filter((_, i) => reasons[i + 1]?.Code === "ConditionalCheckFailed")
        .map((u) => u.productId);
      if (short.length) throw new OutOfStockError(short);
      throw error;
    }
  }

  async getOrder(id: string): Promise<Order | null> {
    const res = await this.db.send(new GetCommand({ TableName: this.table, Key: { PK: `ORDER#${id}`, SK: "ORDER" } }));
    return res.Item ? fromOrderItem(res.Item) : null;
  }

  async listOrders(limit = 50): Promise<Order[]> {
    const res = await this.db.send(
      new QueryCommand({
        TableName: this.table,
        IndexName: GSI1,
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: { ":pk": "ORDER" },
        ScanIndexForward: false,
        Limit: limit,
      }),
    );
    return (res.Items ?? []).map(fromOrderItem);
  }

  async saveOrder(order: Order, expectedUpdatedAt: string): Promise<void> {
    try {
      await this.db.send(
        new PutCommand({
          TableName: this.table,
          Item: orderItem(order),
          ConditionExpression: "updatedAt = :expected",
          ExpressionAttributeValues: { ":expected": expectedUpdatedAt },
        }),
      );
    } catch (error) {
      if (isConditionalFailure(error)) throw new ConflictError(`Order ${order.id} was modified concurrently`);
      throw error;
    }
  }

  async listVideos(): Promise<TikTokVideo[]> {
    const items = await this.queryAll({
      TableName: this.table,
      IndexName: GSI1,
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": "VIDEO" },
    });
    return items.map((item) => stripKeys<TikTokVideo>(item));
  }

  async getVideos(ids: string[]): Promise<TikTokVideo[]> {
    const items = await this.batchGet([...new Set(ids)].map((id) => ({ PK: `VIDEO#${id}`, SK: "VIDEO" })));
    const byId = new Map(items.map((item) => [item.id as string, stripKeys<TikTokVideo>(item)]));
    return ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  }

  async putVideos(videos: TikTokVideo[]): Promise<void> {
    for (let i = 0; i < videos.length; i += 25) {
      await this.db.send(
        new TransactWriteCommand({
          TransactItems: videos.slice(i, i + 25).map((video) => ({
            Put: { TableName: this.table, Item: { PK: `VIDEO#${video.id}`, SK: "VIDEO", GSI1PK: "VIDEO", GSI1SK: video.id, ...video } },
          })),
        }),
      );
    }
  }

  async listPromotions(): Promise<Promotion[]> {
    const items = await this.queryAll({
      TableName: this.table,
      IndexName: GSI1,
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": "PROMO" },
    });
    return items.map((item) => stripKeys<Promotion>(item));
  }

  async putPromotion(promotion: Promotion): Promise<void> {
    await this.db.send(
      new PutCommand({
        TableName: this.table,
        Item: { PK: `PROMO#${promotion.id}`, SK: "PROMO", GSI1PK: "PROMO", GSI1SK: promotion.endsAt, ...promotion },
      }),
    );
  }

  async deletePromotion(id: string): Promise<void> {
    await this.db.send(new DeleteCommand({ TableName: this.table, Key: { PK: `PROMO#${id}`, SK: "PROMO" } }));
  }

  async claimEvent(eventId: string, ttlSeconds: number): Promise<boolean> {
    const now = Math.floor(Date.now() / 1000);
    try {
      await this.db.send(
        new PutCommand({
          TableName: this.table,
          Item: { PK: `EVENT#${eventId}`, SK: "EVENT", expiresAt: now + ttlSeconds },
          // An expired claim may linger until TTL deletion runs; it no longer counts.
          ConditionExpression: "attribute_not_exists(PK) OR expiresAt < :now",
          ExpressionAttributeValues: { ":now": now },
        }),
      );
      return true;
    } catch (error) {
      if (isConditionalFailure(error)) return false;
      throw error;
    }
  }

  async isEventClaimed(eventId: string): Promise<boolean> {
    const res = await this.db.send(
      new GetCommand({ TableName: this.table, Key: { PK: `EVENT#${eventId}`, SK: "EVENT" }, ConsistentRead: true }),
    );
    // TTL deletion is lazy, so honour the expiry explicitly.
    return Boolean(res.Item && Number(res.Item.expiresAt) > Date.now() / 1000);
  }

  async releaseEvent(eventId: string): Promise<void> {
    await this.db.send(new DeleteCommand({ TableName: this.table, Key: { PK: `EVENT#${eventId}`, SK: "EVENT" } }));
  }

  async getSyncState(): Promise<SyncState> {
    const res = await this.db.send(new GetCommand({ TableName: this.table, Key: { PK: "SYNC#tiktok", SK: "STATE" } }));
    if (!res.Item) return {};
    const { PK: _pk, SK: _sk, ...state } = res.Item;
    return state as SyncState;
  }

  async setSyncState(state: SyncState): Promise<void> {
    await this.db.send(new PutCommand({ TableName: this.table, Item: { PK: "SYNC#tiktok", SK: "STATE", ...state } }));
  }
}
