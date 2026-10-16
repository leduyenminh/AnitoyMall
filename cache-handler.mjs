// Per-instance, in-memory cache for ISR pages, route handlers and optimised images.
//
// Why: on AWS Lambda the application directory is read-only, so Next's default filesystem cache
// cannot write regenerated pages. CloudFront is the shared cache in front of every instance; this
// handler only needs to keep a warm copy inside one instance. It also guarantees pages are never
// served from data baked in at build time (an empty cache renders against the live database).

const MAX_ENTRIES = Number(process.env.NEXT_CACHE_MAX_ENTRIES ?? 500);

/** @type {Map<string, { value: unknown, lastModified: number, tags: string[], cacheControl?: unknown }>} */
const store = new Map();

function tagsOf(data, ctx) {
  const tags = new Set(ctx?.tags ?? []);
  const header = data?.headers?.["x-next-cache-tags"];
  if (typeof header === "string") {
    for (const tag of header.split(",")) if (tag) tags.add(tag);
  }
  return [...tags];
}

export default class CacheHandler {
  constructor(options) {
    this.options = options;
  }

  async get(key) {
    const entry = store.get(key);
    if (!entry) return null;
    // Refresh recency so the eviction below behaves like an LRU.
    store.delete(key);
    store.set(key, entry);
    return { value: entry.value, lastModified: entry.lastModified, cacheControl: entry.cacheControl };
  }

  async set(key, data, ctx) {
    if (data === null) {
      store.delete(key);
      return;
    }
    store.delete(key);
    store.set(key, {
      value: data,
      lastModified: Date.now(),
      tags: tagsOf(data, ctx),
      cacheControl: ctx?.cacheControl,
    });
    while (store.size > MAX_ENTRIES) {
      const oldest = store.keys().next().value;
      if (oldest === undefined) break;
      store.delete(oldest);
    }
  }

  async revalidateTag(tags) {
    const wanted = new Set([tags].flat());
    for (const [key, entry] of store) {
      if (entry.tags.some((tag) => wanted.has(tag))) store.delete(key);
    }
  }

  resetRequestCache() {}
}
