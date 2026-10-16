// Turn Mall of Anitoy's own TikTok media into storefront assets.
//
//   node scripts/import-tiktok-media.mjs <folder> [<folder> ...]
//
// Recognised files:
//   <productId>-<n>.jpg   TikTok Shop listing photos (the shop's product images, 800×800)
//                         → public/shop/products/<productId>-<n>.webp
//   <videoId>.jpg         video covers (1080×1920)
//                         → public/shop/videos/<id>.webp         poster for the TikTok player
//                         → public/shop/videos/<id>-square.webp  fallback photo for items without
//                           listing photos, cropped around the figure
//   avatar.jpg            profile picture → public/shop/avatar.webp, src/app/icon.png,
//                         apple-icon.png, favicon.ico
//
// In production the TikTok Shop sync mirrors listing photos and the video sync mirrors covers,
// so this script is only needed to refresh the bundled starter catalog.

import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const folders = process.argv.slice(2);
if (!folders.length) {
  console.error("Usage: node scripts/import-tiktok-media.mjs <folder> [<folder> ...]");
  process.exit(1);
}

const root = path.join(import.meta.dirname, "..");
const out = (...parts) => {
  const file = path.join(root, ...parts);
  mkdirSync(path.dirname(file), { recursive: true });
  return file;
};

let listingPhotos = 0;
let covers = 0;

for (const folder of folders) {
  for (const file of readdirSync(folder)) {
    const input = path.join(folder, file);
    const listing = /^(\d+)-(\d+)\.(jpe?g|png|webp)$/i.exec(file);
    const cover = /^(\d+)\.(jpe?g|png|webp)$/i.exec(file);

    if (listing) {
      await sharp(input)
        .resize(800, 800, { fit: "cover" })
        .webp({ quality: 82 })
        .toFile(out("public", "shop", "products", `${listing[1]}-${listing[2]}.webp`));
      listingPhotos++;
    } else if (cover) {
      const id = cover[1];
      await sharp(input).resize(480, 854, { fit: "cover" }).webp({ quality: 76 }).toFile(out("public", "shop", "videos", `${id}.webp`));
      // Covers carry caption text at the top and the figure around the middle.
      const { width = 1080, height = 1920 } = await sharp(input).metadata();
      const side = Math.min(width, height);
      const top = Math.max(0, Math.min(Math.round(height * 0.52 - side / 2), height - side));
      await sharp(input)
        .extract({ left: Math.round((width - side) / 2), top, width: side, height: side })
        .resize(720, 720)
        .webp({ quality: 78 })
        .toFile(out("public", "shop", "videos", `${id}-square.webp`));
      covers++;
    }
  }

  const avatar = path.join(folder, "avatar.jpg");
  if (!existsSync(avatar)) continue;
  await sharp(avatar).resize(256, 256).webp({ quality: 85 }).toFile(out("public", "shop", "avatar.webp"));
  const circle = (size) =>
    Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`);
  const roundIcon = (size) =>
    sharp(avatar).resize(size, size).composite([{ input: circle(size), blend: "dest-in" }]).png().toBuffer();
  writeFileSync(out("src", "app", "icon.png"), await roundIcon(512));
  writeFileSync(out("src", "app", "apple-icon.png"), await sharp(avatar).resize(180, 180).png().toBuffer());

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
  writeFileSync(out("src", "app", "favicon.ico"), Buffer.concat([header, ...pngs]));
  console.log("Wrote avatar, icon.png, apple-icon.png and favicon.ico");
}

console.log(`Processed ${listingPhotos} listing photos and ${covers} video covers`);
