// Turn the shop's own TikTok media (video covers + profile avatar) into storefront assets.
//
//   node scripts/import-tiktok-media.mjs <folder-with-covers>
//
// The folder holds `<videoId>.jpg` cover images and `avatar.jpg` (downloaded from the
// @leduyenminh profile). Outputs:
//   public/shop/videos/<id>.webp      portrait poster for the TikTok player facade (9:16)
//   public/shop/videos/<id>-product.webp  4:5 product image cropped around the figure
//   public/shop/avatar.webp           shop logo
//   src/app/icon.png, apple-icon.png, favicon.ico
//
// In production, new covers are mirrored automatically by the video sync (see lib/tiktok/display.ts).

import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const source = process.argv[2];
if (!source) {
  console.error("Usage: node scripts/import-tiktok-media.mjs <folder-with-covers>");
  process.exit(1);
}

const root = path.join(import.meta.dirname, "..");
const videosOut = path.join(root, "public", "shop", "videos");
mkdirSync(videosOut, { recursive: true });

const covers = readdirSync(source).filter((f) => /^\d+\.(jpe?g|png|webp)$/i.test(f));
for (const file of covers) {
  const id = file.replace(/\.\w+$/, "");
  const input = path.join(source, file);
  await sharp(input).resize(480, 854, { fit: "cover" }).webp({ quality: 76 }).toFile(path.join(videosOut, `${id}.webp`));
  // Product image (4:5): covers carry caption text at the top and the figure sits in the middle,
  // so crop a window starting a fifth of the way down.
  const { width = 1080, height = 1920 } = await sharp(input).metadata();
  const cropHeight = Math.min(height, Math.round(width * 1.25));
  const top = Math.min(Math.round(height * 0.2), height - cropHeight);
  await sharp(input)
    .extract({ left: 0, top, width, height: cropHeight })
    .resize(720, 900)
    .webp({ quality: 78 })
    .toFile(path.join(videosOut, `${id}-product.webp`));
}
console.log(`Processed ${covers.length} covers into public/shop/videos`);

const avatar = path.join(source, "avatar.jpg");
await sharp(avatar).resize(256, 256).webp({ quality: 85 }).toFile(path.join(root, "public", "shop", "avatar.webp"));

const circle = (size) =>
  Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`);
const roundIcon = (size) =>
  sharp(avatar).resize(size, size).composite([{ input: circle(size), blend: "dest-in" }]).png().toBuffer();

writeFileSync(path.join(root, "src", "app", "icon.png"), await roundIcon(512));
writeFileSync(path.join(root, "src", "app", "apple-icon.png"), await sharp(avatar).resize(180, 180).png().toBuffer());

// favicon.ico: 16/32/48 px PNGs in an ICO container.
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map(roundIcon));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const at = 6 + i * 16;
  header.writeUInt8(s, at);
  header.writeUInt8(s, at + 1);
  header.writeUInt16LE(1, at + 4);
  header.writeUInt16LE(32, at + 6);
  header.writeUInt32LE(pngs[i].length, at + 8);
  header.writeUInt32LE(offset, at + 12);
  offset += pngs[i].length;
});
writeFileSync(path.join(root, "src", "app", "favicon.ico"), Buffer.concat([header, ...pngs]));
console.log("Wrote avatar, icon.png, apple-icon.png and favicon.ico");
