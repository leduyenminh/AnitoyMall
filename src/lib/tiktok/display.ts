import { log } from "../log";
import { mirrorImage } from "../media";
import { getRepository } from "../repo";
import type { TikTokVideo } from "../types";
import { loadCredentials, saveCredentials } from "./credentials";

// TikTok Display API: the creator authorises this site once (Login Kit, scopes user.info.basic +
// video.list) and the sync worker then reads the account's videos with their current view counts.
// This keeps the counts on the website in step with TikTok, including plays made through the
// embedded players on this site (those are served by TikTok's own player).

const API = "https://open.tiktokapis.com/v2";
export const DISPLAY_SCOPES = "user.info.basic,video.list";
const VIDEO_FIELDS = "id,title,video_description,cover_image_url,view_count,like_count,create_time";

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_expires_in?: number;
  open_id?: string;
  error?: string;
  error_description?: string;
}

export interface DisplayVideo {
  id: string;
  title?: string;
  video_description?: string;
  cover_image_url?: string;
  view_count?: number;
  like_count?: number;
  create_time?: number;
}

export function displayAuthorizeUrl(clientKey: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_key: clientKey,
    response_type: "code",
    scope: DISPLAY_SCOPES,
    redirect_uri: redirectUri,
    state,
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${params}`;
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch(`${API}/oauth/token/`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "cache-control": "no-cache" },
    body: new URLSearchParams(body),
  });
  const json = (await res.json()) as TokenResponse;
  if (!res.ok || !json.access_token) throw new Error(`TikTok token error: ${json.error} ${json.error_description ?? ""}`.trim());
  const now = Math.floor(Date.now() / 1000);
  return {
    displayAccessToken: json.access_token,
    displayAccessTokenExpiresAt: now + (json.expires_in ?? 0),
    displayRefreshToken: json.refresh_token,
    displayRefreshTokenExpiresAt: now + (json.refresh_expires_in ?? 0),
    displayOpenId: json.open_id,
  };
}

export async function exchangeDisplayCode(code: string, redirectUri: string): Promise<void> {
  const { displayClientKey, displayClientSecret } = await loadCredentials({ fresh: true });
  if (!displayClientKey || !displayClientSecret) throw new Error("TikTok Display API client key/secret are not configured");
  const tokens = await tokenRequest({
    client_key: displayClientKey,
    client_secret: displayClientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
  await saveCredentials({ ...tokens, displayConnectedAt: new Date().toISOString() });
}

/** A valid access token, refreshed when it expires within the hour (it lives ~24h). */
async function accessToken(): Promise<string | null> {
  const creds = await loadCredentials();
  if (!creds.displayAccessToken || !creds.displayClientKey || !creds.displayClientSecret) return null;
  if ((creds.displayAccessTokenExpiresAt ?? 0) - Date.now() / 1000 > 3600) return creds.displayAccessToken;
  if (!creds.displayRefreshToken) return null;
  const tokens = await tokenRequest({
    client_key: creds.displayClientKey,
    client_secret: creds.displayClientSecret,
    grant_type: "refresh_token",
    refresh_token: creds.displayRefreshToken,
  });
  await saveCredentials(tokens);
  return tokens.displayAccessToken;
}

async function listVideos(token: string): Promise<DisplayVideo[]> {
  const videos: DisplayVideo[] = [];
  let cursor: number | undefined;
  for (let page = 0; page < 50; page++) {
    const res = await fetch(`${API}/video/list/?fields=${VIDEO_FIELDS}`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ max_count: 20, ...(cursor ? { cursor } : {}) }),
    });
    const json = (await res.json()) as {
      data?: { videos?: DisplayVideo[]; cursor?: number; has_more?: boolean };
      error?: { code?: string; message?: string };
    };
    if (!res.ok || (json.error?.code && json.error.code !== "ok")) {
      throw new Error(`TikTok video list error: ${json.error?.code} ${json.error?.message ?? ""}`.trim());
    }
    videos.push(...(json.data?.videos ?? []));
    if (!json.data?.has_more) break;
    cursor = json.data.cursor;
  }
  return videos;
}

/** Merge TikTok's current data into a stored video (or create one for a new video). */
export async function mergeVideo(existing: TikTokVideo | undefined, video: DisplayVideo, now: string): Promise<TikTokVideo> {
  // Covers from the API are signed URLs that expire, so new covers are copied to our storage.
  const cover =
    existing?.cover ?? (video.cover_image_url ? await mirrorImage(video.cover_image_url, "videos", video.id) : "");
  return {
    ...existing,
    id: video.id,
    title: existing?.title ?? (video.title || video.video_description || "").slice(0, 150),
    views: video.view_count ?? existing?.views ?? 0,
    likes: video.like_count ?? existing?.likes,
    cover,
    createdAt: existing?.createdAt ?? (video.create_time ? new Date(video.create_time * 1000).toISOString() : undefined),
    updatedAt: now,
  };
}

export async function syncVideoStats(): Promise<{ skipped?: string; videos: number; added: number }> {
  const token = await accessToken();
  if (!token) return { skipped: "TikTok account (Display API) is not connected", videos: 0, added: 0 };

  const repo = await getRepository();
  const state = await repo.getSyncState();
  try {
    const known = new Map((await repo.listVideos()).map((v) => [v.id, v]));
    const now = new Date().toISOString();
    const fresh = await listVideos(token);
    const merged = await Promise.all(fresh.map((v) => mergeVideo(known.get(v.id), v, now)));
    await repo.putVideos(merged);
    const added = fresh.filter((v) => !known.has(v.id)).length;
    await repo.setSyncState({ ...state, videosSyncedAt: now, videosSynced: merged.length, videosError: undefined });
    log.info("tiktok.videos.synced", { videos: merged.length, added });
    return { videos: merged.length, added };
  } catch (error) {
    await repo.setSyncState({ ...state, videosError: String(error) });
    throw error;
  }
}
