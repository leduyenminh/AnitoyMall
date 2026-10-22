import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let dir: string;
let rateLimit: typeof import("./rate-limit");

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "anitoy-rate-"));
  vi.stubEnv("LOCAL_DATA_DIR", dir);
  vi.stubEnv("DATA_BACKEND", "local");
  vi.resetModules();
  rateLimit = await import("./rate-limit");
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

// Next midnight UTC, so the 10-minute and daily windows both start here (and no counter used in
// these tests has expired in real time yet).
const DAY_START = (Math.floor(Date.now() / 86_400_000) + 1) * 86_400_000;

describe("clientKey", () => {
  it("keeps IPv4 addresses whole", () => {
    expect(rateLimit.clientKey(" 203.0.113.7 ")).toBe("203.0.113.7");
    expect(rateLimit.clientKey("::ffff:203.0.113.7")).toBe("203.0.113.7");
  });

  it("groups IPv6 addresses by their /64 network", () => {
    const key = rateLimit.clientKey("2001:db8:abcd:12::5");
    expect(key).toBe("2001:db8:abcd:12::/64");
    expect(rateLimit.clientKey("2001:0DB8:abcd:0012:ffff:1:2:3")).toBe(key);
    expect(rateLimit.clientKey("[2001:db8:abcd:12::99]")).toBe(key);
    expect(rateLimit.clientKey("2001:db8:abcd:13::5")).not.toBe(key);
    expect(rateLimit.clientKey("2001:db8::")).toBe("2001:db8:0:0::/64");
  });
});

describe("checkRateLimit", () => {
  const rules = [{ limit: 3, windowSeconds: 600 }];

  it("blocks the request after the limit until the window ends", async () => {
    const at = DAY_START + 60_000; // 1 minute into the window
    for (let i = 0; i < 3; i++) expect(await rateLimit.checkRateLimit("t1", "198.51.100.1", rules, at)).toBeNull();
    expect(await rateLimit.checkRateLimit("t1", "198.51.100.1", rules, at)).toEqual({ retryAfter: 540 });
    // Another client and another scope are counted separately.
    expect(await rateLimit.checkRateLimit("t1", "198.51.100.2", rules, at)).toBeNull();
    expect(await rateLimit.checkRateLimit("t2", "198.51.100.1", rules, at)).toBeNull();
    // The next window starts fresh.
    expect(await rateLimit.checkRateLimit("t1", "198.51.100.1", rules, DAY_START + 600_000)).toBeNull();
  });

  it("applies the daily order limit across short windows", async () => {
    // One order every 10 minutes stays under the short limit, but not the daily one.
    for (let i = 0; i < 30; i++) {
      expect(await rateLimit.checkRateLimit("order", "198.51.100.9", rateLimit.ORDER_LIMITS, DAY_START + i * 600_000)).toBeNull();
    }
    const at = DAY_START + 30 * 600_000;
    expect(await rateLimit.checkRateLimit("order", "198.51.100.9", rateLimit.ORDER_LIMITS, at)).toEqual({
      retryAfter: 86_400 - 30 * 600,
    });
  });

  it("lets requests through when the client IP is unknown", async () => {
    for (let i = 0; i < 5; i++) expect(await rateLimit.checkRateLimit("t3", undefined, rules, DAY_START)).toBeNull();
  });
});
