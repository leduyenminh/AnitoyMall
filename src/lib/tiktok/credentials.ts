import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config";

/**
 * Everything needed to talk to TikTok on the seller's behalf. On AWS this is one JSON secret in
 * Secrets Manager: the app credentials are entered once by the operator, the OAuth tokens are
 * written by the authorization callback and refreshed by the sync worker.
 */
export interface TikTokCredentials {
  appKey?: string;
  appSecret?: string;
  serviceId?: string;
  /** TikTok for Business Events API token (server-side conversions). */
  eventsAccessToken?: string;
  accessToken?: string;
  /** Unix seconds. */
  accessTokenExpiresAt?: number;
  refreshToken?: string;
  refreshTokenExpiresAt?: number;
  shopCipher?: string;
  shopId?: string;
  shopName?: string;
  shopRegion?: string;
  sellerName?: string;
  connectedAt?: string;

  // TikTok for Developers app (Login Kit + Display API) that reads the creator's own videos and
  // their view counts. Separate from the TikTok Shop app above.
  displayClientKey?: string;
  displayClientSecret?: string;
  displayAccessToken?: string;
  /** Unix seconds. */
  displayAccessTokenExpiresAt?: number;
  displayRefreshToken?: string;
  displayRefreshTokenExpiresAt?: number;
  displayOpenId?: string;
  displayConnectedAt?: string;
}

const CACHE_MS = 60_000;
let cache: { value: TikTokCredentials; at: number } | undefined;

async function secretsClient() {
  const { SecretsManagerClient } = await import("@aws-sdk/client-secrets-manager");
  return new SecretsManagerClient({ region: config.aws.region });
}

async function loadStored(): Promise<TikTokCredentials> {
  if (config.aws.tiktokSecretArn) {
    const { GetSecretValueCommand } = await import("@aws-sdk/client-secrets-manager");
    const res = await (await secretsClient()).send(new GetSecretValueCommand({ SecretId: config.aws.tiktokSecretArn }));
    return res.SecretString ? (JSON.parse(res.SecretString) as TikTokCredentials) : {};
  }
  try {
    return JSON.parse(await readFile(path.resolve(config.localDataDir, "tiktok.json"), "utf8")) as TikTokCredentials;
  } catch {
    return {};
  }
}

/** Stored credentials, with environment variables taking precedence for the app identity. */
export async function loadCredentials({ fresh = false } = {}): Promise<TikTokCredentials> {
  if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const stored = await loadStored();
  const value: TikTokCredentials = {
    ...stored,
    appKey: config.tiktok.appKey ?? stored.appKey,
    appSecret: config.tiktok.appSecret ?? stored.appSecret,
    serviceId: config.tiktok.serviceId ?? stored.serviceId,
    eventsAccessToken: config.tiktok.eventsAccessToken ?? stored.eventsAccessToken,
    displayClientKey: config.tiktok.displayClientKey ?? stored.displayClientKey,
    displayClientSecret: config.tiktok.displayClientSecret ?? stored.displayClientSecret,
  };
  cache = { value, at: Date.now() };
  return value;
}

/** Merge a patch into the stored credentials (read-modify-write against the latest version). */
export async function saveCredentials(patch: Partial<TikTokCredentials>): Promise<void> {
  const next = { ...(await loadStored()), ...patch };
  if (config.aws.tiktokSecretArn) {
    const { PutSecretValueCommand } = await import("@aws-sdk/client-secrets-manager");
    await (await secretsClient()).send(
      new PutSecretValueCommand({ SecretId: config.aws.tiktokSecretArn, SecretString: JSON.stringify(next) }),
    );
  } else {
    const file = path.resolve(config.localDataDir, "tiktok.json");
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(next, null, 2));
  }
  cache = undefined;
}
