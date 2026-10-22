import { log } from "./log";
import { getRepository } from "./repo";

// Fixed-window request limits per client IP, counted in the data store so every Lambda instance
// shares them. They stop one machine from flooding checkout with orders that reserve stock (and
// lower TikTok Shop stock with them), or from guessing phone numbers on the order lookup.

export interface RateRule {
  limit: number;
  windowSeconds: number;
}

/** Placing orders. Generous enough for a shared mobile-carrier IP; a script hits it in seconds. */
export const ORDER_LIMITS: RateRule[] = [
  { limit: 6, windowSeconds: 10 * 60 },
  { limit: 30, windowSeconds: 24 * 3600 },
];

/** Order lookup by code + phone. */
export const LOOKUP_LIMITS: RateRule[] = [
  { limit: 10, windowSeconds: 10 * 60 },
  { limit: 50, windowSeconds: 24 * 3600 },
];

/**
 * The part of an IP that identifies one client: the whole IPv4 address, or the /64 prefix of an
 * IPv6 address (one home or phone gets a whole /64, so single addresses are free to rotate).
 */
export function clientKey(ip: string): string {
  const [address = ""] = ip.trim().toLowerCase().replace(/^\[|\]$/g, "").split("%");
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mapped) return mapped;
  if (!address.includes(":")) return address;
  const [head = "", tail] = address.split("::");
  const left = head ? head.split(":") : [];
  const right = tail !== undefined && tail ? tail.split(":") : [];
  const groups = tail === undefined ? left : [...left, ...Array(8 - left.length - right.length).fill("0"), ...right];
  return `${groups.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, "")).join(":")}::/64`;
}

/**
 * Count one request from `ip` against every rule of `scope`. Returns how many seconds the caller
 * must wait when a limit is exceeded, or null when the request may go ahead. Without a known IP,
 * or when the store is unavailable, requests are let through: checkout must keep working.
 */
export async function checkRateLimit(
  scope: string,
  ip: string | undefined,
  rules: RateRule[],
  now = Date.now(),
): Promise<{ retryAfter: number } | null> {
  if (!ip) return null;
  const key = clientKey(ip);
  const seconds = Math.floor(now / 1000);
  try {
    const repo = await getRepository();
    let retryAfter = 0;
    for (const { limit, windowSeconds } of rules) {
      const window = Math.floor(seconds / windowSeconds);
      const windowEnds = (window + 1) * windowSeconds;
      const count = await repo.incrementCounter(`${scope}:${windowSeconds}:${key}:${window}`, windowEnds + 60);
      if (count > limit) retryAfter = Math.max(retryAfter, windowEnds - seconds);
    }
    if (!retryAfter) return null;
    log.warn("rate_limited", { scope, retryAfter });
    return { retryAfter };
  } catch (error) {
    log.error("rate_limit.failed", { scope, error: String(error) });
    return null;
  }
}
