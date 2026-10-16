import { config } from "../config";
import { loadCredentials, saveCredentials, type TikTokCredentials } from "./credentials";

interface TokenResponse {
  code: number;
  message: string;
  data?: {
    access_token: string;
    access_token_expire_in: number;
    refresh_token: string;
    refresh_token_expire_in: number;
    open_id?: string;
    seller_name?: string;
    seller_base_region?: string;
  };
}

/** Where the seller is sent to grant this app access to their TikTok Shop. */
export function authorizeUrl(serviceId: string, state: string): string {
  const params = new URLSearchParams({ service_id: serviceId, state });
  return `${config.tiktok.authorizeBase}/open/authorize?${params}`;
}

async function tokenRequest(params: Record<string, string>): Promise<NonNullable<TokenResponse["data"]>> {
  const url = `${config.tiktok.authBase}/api/v2/token/get?${new URLSearchParams(params)}`;
  const res = await fetch(url, { method: "GET" });
  const json = (await res.json()) as TokenResponse;
  if (!res.ok || json.code !== 0 || !json.data) {
    throw new Error(`TikTok token request failed: ${json.code} ${json.message}`);
  }
  return json.data;
}

function tokenPatch(data: NonNullable<TokenResponse["data"]>): Partial<TikTokCredentials> {
  return {
    accessToken: data.access_token,
    accessTokenExpiresAt: data.access_token_expire_in,
    refreshToken: data.refresh_token,
    refreshTokenExpiresAt: data.refresh_token_expire_in,
    ...(data.seller_name ? { sellerName: data.seller_name } : {}),
    ...(data.seller_base_region ? { shopRegion: data.seller_base_region } : {}),
  };
}

/** Exchange the one-time authorization code from the OAuth redirect for tokens, and store them. */
export async function exchangeAuthCode(authCode: string): Promise<void> {
  const creds = await loadCredentials({ fresh: true });
  if (!creds.appKey || !creds.appSecret) throw new Error("TikTok app key/secret are not configured");
  const data = await tokenRequest({
    app_key: creds.appKey,
    app_secret: creds.appSecret,
    auth_code: authCode,
    grant_type: "authorized_code",
  });
  await saveCredentials({ ...tokenPatch(data), connectedAt: new Date().toISOString() });
}

/** Refresh the access token when it expires within `withinSeconds`. Returns current credentials. */
export async function ensureFreshToken(withinSeconds = 3600): Promise<TikTokCredentials> {
  const creds = await loadCredentials();
  const now = Math.floor(Date.now() / 1000);
  if (!creds.accessToken || !creds.refreshToken || !creds.appKey || !creds.appSecret) return creds;
  if ((creds.accessTokenExpiresAt ?? 0) - now > withinSeconds) return creds;

  const data = await tokenRequest({
    app_key: creds.appKey,
    app_secret: creds.appSecret,
    refresh_token: creds.refreshToken,
    grant_type: "refresh_token",
  });
  await saveCredentials(tokenPatch(data));
  return loadCredentials({ fresh: true });
}
