import { createHash } from "node:crypto";
import { config } from "./config";
import type { TtsImage } from "./tiktok/types";

// TikTok image URLs (TikTok Shop product photos, video covers) are signed CDN links that expire.
// When a media bucket is configured, images are copied into S3 once and served from our own
// CloudFront distribution under /media/. Without a bucket (local dev) the TikTok URLs are used.

let s3: Promise<import("@aws-sdk/client-s3").S3Client> | undefined;
const client = () =>
  (s3 ??= import("@aws-sdk/client-s3").then((m) => new m.S3Client({ region: config.aws.region })));

const extensionFor = (contentType: string | null) =>
  contentType?.includes("png") ? "png" : contentType?.includes("webp") ? "webp" : "jpg";

/**
 * Copy one remote image into the media bucket as `media/<folder>/<name>.<ext>` and return its
 * public URL. Without a bucket the source URL is returned unchanged.
 */
export async function mirrorImage(source: string, folder: string, name: string): Promise<string> {
  const { mediaBucket, mediaBaseUrl } = config.aws;
  if (!mediaBucket || !mediaBaseUrl) return source;
  const res = await fetch(source);
  if (!res.ok) throw new Error(`Image download failed (${res.status}) for ${source}`);
  const contentType = res.headers.get("content-type");
  const key = `media/${folder}/${name}.${extensionFor(contentType)}`;
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  await (await client()).send(
    new PutObjectCommand({
      Bucket: mediaBucket,
      Key: key,
      Body: new Uint8Array(await res.arrayBuffer()),
      ContentType: contentType ?? "image/jpeg",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return `${mediaBaseUrl}/${key.slice("media/".length)}`;
}

async function mirrorOne(image: TtsImage, known: Set<string>): Promise<string | undefined> {
  const source = image.urls?.[0];
  if (!source) return undefined;
  // Keyed by TikTok's stable image URI so a re-sync reuses the earlier copy (any extension).
  const hash = createHash("sha256").update(image.uri ?? source).digest("hex").slice(0, 24);
  const { mediaBaseUrl } = config.aws;
  const existing = mediaBaseUrl ? [...known].find((url) => url.startsWith(`${mediaBaseUrl}/products/${hash}.`)) : undefined;
  return existing ?? mirrorImage(source, "products", hash);
}

/** Resolve product images to durable URLs, reusing mirrors recorded on the existing product. */
export async function mirrorImages(images: TtsImage[], existingUrls: string[] = []): Promise<string[]> {
  const known = new Set(existingUrls);
  const urls: string[] = [];
  for (const image of images) {
    const url = await mirrorOne(image, known);
    if (url) urls.push(url);
  }
  return urls;
}
