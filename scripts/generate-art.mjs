// Generates the placeholder product illustrations in public/products/.
// They stand in for real photos until the catalog is synced from TikTok Shop (which brings the
// seller's own product images). Run with: npm run art

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUT = path.join(import.meta.dirname, "..", "public", "art");
mkdirSync(OUT, { recursive: true });

const SKIN = "#ffe6d5";
const SKIN_SHADE = "#f6cdb6";
const INK = "#3a2a35";

const characters = {
  frieren: {
    hair: "#eef0f6", hairShade: "#c6cbe0", eyes: "#3fa877", outfit: "#fbfbfd", trim: "#d8b25a",
    inner: "#2c3140", style: "twintails", elf: true, earrings: "#d6334a", boots: "#6b4b3a",
  },
  fern: {
    hair: "#7d52b8", hairShade: "#5b3a8e", eyes: "#7446b0", outfit: "#2b2534", trim: "#ffffff",
    inner: "#ffffff", style: "long", boots: "#2b2534",
  },
  stark: {
    hair: "#d9432f", hairShade: "#a32d1e", eyes: "#5d7fcb", outfit: "#55684c", trim: "#8b5a2b",
    inner: "#e9e2d0", style: "spiky", boots: "#5a3b24",
  },
  kinako: {
    hair: "#e9a95c", hairShade: "#c6833b", eyes: "#b8622f", outfit: "#fff3df", trim: "#5b8ed6",
    inner: "#ffffff", style: "neko", boots: "#e9a95c",
  },
};

function eyes(c) {
  return [345, 455]
    .map(
      (x) => `
    <ellipse cx="${x}" cy="362" rx="27" ry="35" fill="${c.eyes}"/>
    <ellipse cx="${x}" cy="372" rx="17" ry="22" fill="${INK}" opacity=".55"/>
    <circle cx="${x - 9}" cy="350" r="9" fill="#fff"/>
    <circle cx="${x + 9}" cy="380" r="4.5" fill="#fff" opacity=".85"/>
    <path d="M${x - 31} 334 Q${x} 316 ${x + 31} 334" stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round"/>`,
    )
    .join("");
}

function face(c) {
  return `
    <circle cx="400" cy="330" r="150" fill="${SKIN}"/>
    <ellipse cx="400" cy="470" rx="38" ry="14" fill="${SKIN_SHADE}" opacity=".6"/>
    ${eyes(c)}
    <ellipse cx="318" cy="410" rx="22" ry="11" fill="#ff8fa3" opacity=".45"/>
    <ellipse cx="482" cy="410" rx="22" ry="11" fill="#ff8fa3" opacity=".45"/>
    <path d="M388 418 Q400 428 412 418" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
}

function hairBack(c) {
  switch (c.style) {
    case "long":
      return `<path d="M250 300 Q240 180 400 170 Q560 180 550 300 L575 620 Q400 660 225 620 Z" fill="${c.hairShade}"/>`;
    case "twintails":
      return `
        <path d="M262 300 Q190 380 205 520 Q215 610 175 660 Q260 640 285 540 Q300 450 290 330 Z" fill="${c.hairShade}"/>
        <path d="M538 300 Q610 380 595 520 Q585 610 625 660 Q540 640 515 540 Q500 450 510 330 Z" fill="${c.hairShade}"/>
        <circle cx="272" cy="300" r="16" fill="${c.trim}"/><circle cx="528" cy="300" r="16" fill="${c.trim}"/>`;
    case "neko":
      return `<path d="M250 300 Q245 180 400 172 Q555 180 550 300 L560 450 Q400 480 240 450 Z" fill="${c.hairShade}"/>`;
    default:
      return "";
  }
}

function hairFront(c) {
  if (c.style === "spiky") {
    return `
      <path d="M240 345 L232 250 L270 268 L262 190 L312 228 L330 160 L370 210 L400 140 L430 210 L470 160 L488 228 L538 190 L530 268 L568 250 L560 345
               L520 300 L492 330 L458 288 L425 322 L392 280 L360 322 L328 290 L298 330 L268 300 Z" fill="${c.hair}"/>
      <path d="M300 240 L330 200 L345 245 Z M455 245 L470 200 L500 240 Z" fill="${c.hairShade}" opacity=".7"/>`;
  }
  const sideLocks =
    c.style === "neko"
      ? `<path d="M252 330 Q242 410 262 450 L286 360 Z" fill="${c.hair}"/><path d="M548 330 Q558 410 538 450 L514 360 Z" fill="${c.hair}"/>`
      : `<path d="M252 330 Q236 440 268 500 L290 370 Z" fill="${c.hair}"/><path d="M548 330 Q564 440 532 500 L510 370 Z" fill="${c.hair}"/>`;
  return `
    <path d="M245 345 Q248 168 400 162 Q552 168 555 345 L522 298 L492 330 L456 288 L422 326 L388 284 L352 326 L316 290 L280 330 Z" fill="${c.hair}"/>
    <path d="M300 210 Q350 180 400 182" stroke="#fff" stroke-width="10" fill="none" opacity=".55" stroke-linecap="round"/>
    ${sideLocks}`;
}

function extras(c) {
  let out = "";
  if (c.elf) {
    out += `
      <path d="M258 330 L168 286 L262 372 Z" fill="${SKIN}"/><path d="M542 330 L632 286 L538 372 Z" fill="${SKIN}"/>
      <circle cx="252" cy="384" r="8" fill="${c.earrings}"/><circle cx="548" cy="384" r="8" fill="${c.earrings}"/>`;
  }
  if (c.style === "neko") {
    out += `
      <path d="M268 230 L262 120 L350 188 Z" fill="${c.hair}"/><path d="M285 210 L282 150 L330 190 Z" fill="#ffb3c1"/>
      <path d="M532 230 L538 120 L450 188 Z" fill="${c.hair}"/><path d="M515 210 L518 150 L470 190 Z" fill="#ffb3c1"/>`;
  }
  return out;
}

function hood(color, shade) {
  return {
    back: `<path d="M230 360 Q215 160 400 150 Q585 160 570 360 Q575 470 400 480 Q225 470 230 360 Z" fill="${shade}"/>
           <path d="M262 220 L250 100 L345 170 Z M538 220 L550 100 L455 170 Z" fill="${color}"/>
           <path d="M278 200 L272 135 L325 175 Z M522 200 L528 135 L475 175 Z" fill="#ffb3c1"/>`,
    front: `<path d="M240 360 Q235 190 400 182 Q565 190 560 360 Q530 260 400 254 Q270 260 240 360 Z" fill="${color}"/>`,
  };
}

function body(c, outfit = c.outfit) {
  return `
    <rect x="352" y="640" width="38" height="44" rx="14" fill="${c.boots}"/>
    <rect x="410" y="640" width="38" height="44" rx="14" fill="${c.boots}"/>
    <path d="M318 662 Q330 520 368 470 L432 470 Q470 520 482 662 Z" fill="${outfit}"/>
    <path d="M318 662 Q400 690 482 662" stroke="${c.trim}" stroke-width="10" fill="none"/>
    <path d="M368 470 L400 520 L432 470" fill="${c.inner}"/>
    <ellipse cx="322" cy="560" rx="24" ry="44" fill="${outfit}" transform="rotate(18 322 560)"/>
    <ellipse cx="478" cy="560" rx="24" ry="44" fill="${outfit}" transform="rotate(-18 478 560)"/>
    <circle cx="312" cy="600" r="17" fill="${SKIN}"/><circle cx="488" cy="600" r="17" fill="${SKIN}"/>`;
}

const props = {
  staff: (x = 560) => `
    <rect x="${x - 6}" y="300" width="12" height="390" rx="6" fill="#8a5a33"/>
    <circle cx="${x}" cy="292" r="26" fill="#bfe6ff" stroke="#d8b25a" stroke-width="8"/>
    <circle cx="${x - 8}" cy="284" r="7" fill="#fff"/>`,
  flowers: () => `
    <path d="M400 640 L372 520 M400 640 L400 505 M400 640 L430 518 M400 640 L452 540 M400 640 L350 545" stroke="#4f9a5a" stroke-width="7" stroke-linecap="round"/>
    ${[[372, 515], [400, 498], [432, 512], [454, 536], [348, 540], [386, 470], [420, 478]]
      .map(([x, y], i) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288]
        .map((a) => `<ellipse cx="0" cy="-12" rx="9" ry="13" fill="${i % 2 ? "#7fb6ff" : "#a8c8ff"}" transform="rotate(${a})"/>`)
        .join("")}<circle r="6" fill="#ffe08a"/></g>`)
      .join("")}
    <path d="M370 600 L430 600 L440 650 L360 650 Z" fill="#f7f1ff" stroke="#c9b8ef" stroke-width="4"/>`,
  fish: () => `
    <g transform="translate(400 580)">
      <ellipse cx="0" cy="0" rx="170" ry="70" fill="#7fa9d8"/>
      <ellipse cx="-10" cy="22" rx="140" ry="36" fill="#cfe2f6"/>
      <path d="M160 0 L250 -70 L232 0 L250 70 Z" fill="#6a93c4"/>
      <circle cx="-118" cy="-14" r="14" fill="#fff"/><circle cx="-120" cy="-14" r="7" fill="${INK}"/>
      <path d="M-60 -60 Q0 -95 60 -60" fill="#6a93c4"/>
      <path d="M-40 -10 Q-30 10 -40 30 M0 -14 Q10 8 0 30 M40 -12 Q50 8 40 28" stroke="#6a93c4" stroke-width="5" fill="none"/>
    </g>
    <circle cx="275" cy="575" r="20" fill="${SKIN}"/><circle cx="525" cy="575" r="20" fill="${SKIN}"/>`,
  cup: () => `
    <g transform="translate(560 600)">
      <rect x="-30" y="-40" width="60" height="70" rx="12" fill="#fff" stroke="#e3c7a8" stroke-width="5"/>
      <path d="M30 -20 Q55 -15 30 15" stroke="#e3c7a8" stroke-width="6" fill="none"/>
      <path d="M-12 -55 Q-2 -70 -12 -85 M8 -55 Q18 -70 8 -85" stroke="#c9b8a8" stroke-width="4" fill="none" stroke-linecap="round"/>
    </g>`,
};

function figure(c, { tilt = 0, prop, outfit, hoodColor } = {}) {
  const h = hoodColor ? hood(hoodColor.color, hoodColor.shade) : null;
  return `
    <g>
      ${h ? h.back : hairBack(c)}
      ${body(c, outfit)}
      <g transform="rotate(${tilt} 400 470)">
        ${h ? "" : extras(c)}
        ${face(c)}
        ${h ? h.front : hairFront(c)}
      </g>
      ${prop ? props[prop]() : ""}
    </g>`;
}

function scene({ bg, accent }, inner, { pedestal = true } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="75%">
      <stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/>
    </radialGradient>
  </defs>
  <rect width="800" height="800" fill="url(#bg)"/>
  <g fill="#fff" opacity=".5">
    <circle cx="120" cy="140" r="6"/><circle cx="690" cy="120" r="4"/><circle cx="660" cy="300" r="7"/>
    <circle cx="140" cy="420" r="4"/><circle cx="90" cy="610" r="5"/><circle cx="715" cy="560" r="4"/>
  </g>
  <path d="M110 180 l8 -18 l8 18 l18 8 l-18 8 l-8 18 l-8 -18 l-18 -8 z" fill="${accent}" opacity=".7"/>
  <path d="M660 210 l6 -13 l6 13 l13 6 l-13 6 l-6 13 l-6 -13 l-13 -6 z" fill="${accent}" opacity=".7"/>
  ${pedestal ? `<ellipse cx="400" cy="696" rx="230" ry="44" fill="#000" opacity=".08"/><ellipse cx="400" cy="684" rx="200" ry="34" fill="#fff" opacity=".55"/>` : ""}
  ${inner}
</svg>
`;
}

function group(items) {
  // Lay several figures side by side at a smaller scale.
  const n = items.length;
  const scale = n === 2 ? 0.72 : 0.6;
  const spacing = n === 2 ? 270 : 230;
  return items
    .map((item, i) => {
      const x = 400 + (i - (n - 1) / 2) * spacing;
      return `<g transform="translate(${x - 400 * scale} ${700 - 700 * scale}) scale(${scale})">${item}</g>`;
    })
    .join("");
}

const P = {
  mint: { bg: ["#f2fff8", "#bfe9d6"], accent: "#3fa877" },
  sky: { bg: ["#f3f8ff", "#c4d8f7"], accent: "#5d7fcb" },
  lilac: { bg: ["#faf5ff", "#d8c6f1"], accent: "#7d52b8" },
  peach: { bg: ["#fff7ef", "#f7d2b4"], accent: "#e9a95c" },
  rose: { bg: ["#fff5f8", "#f8c9d6"], accent: "#fe2c55" },
  ember: { bg: ["#fff6f2", "#f4c3b5"], accent: "#d9432f" },
  night: { bg: ["#3a3f73", "#1b1e3d"], accent: "#ffe08a" },
};

const { frieren, fern, stark, kinako } = characters;

const files = {
  "frieren-mini-1.svg": scene(P.mint, figure(frieren, { prop: "staff" })),
  "frieren-mini-2.svg": scene(P.sky, figure(frieren, { tilt: -9, prop: "cup" })),
  "fern-mini-1.svg": scene(P.lilac, figure(fern, { prop: "staff" })),
  "fern-mini-2.svg": scene(P.rose, figure(fern, { tilt: 8 })),
  "stark-mini-1.svg": scene(P.ember, figure(stark)),
  "stark-mini-2.svg": scene(P.peach, figure(stark, { tilt: -8, prop: "cup" })),
  "trio-1.svg": scene(P.mint, group([figure(fern), figure(frieren), figure(stark)])),
  "trio-2.svg": scene(P.night, group([figure(stark, { tilt: 6 }), figure(frieren, { tilt: -6 }), figure(fern, { tilt: 6 })])),
  "duo-1.svg": scene(P.lilac, group([figure(fern, { tilt: 7 }), figure(stark, { tilt: -7 })])),
  "frieren-20cm-1.svg": scene(P.sky, figure(frieren, { prop: "staff" })),
  "frieren-20cm-2.svg": scene(P.night, figure(frieren, { tilt: 6, prop: "staff" })),
  "frieren-flowers-1.svg": scene(P.sky, figure(frieren, { prop: "flowers" })),
  "frieren-flowers-2.svg": scene(P.mint, figure(frieren, { tilt: -7, prop: "flowers" })),
  "osakana-1.svg": scene(P.sky, figure(kinako, { prop: "fish" })),
  "osakana-2.svg": scene(P.peach, figure(kinako, { tilt: 7, prop: "fish" })),
  "kinako-1.svg": scene(P.peach, figure(kinako)),
  "kinako-2.svg": scene(P.rose, figure(kinako, { tilt: -8 })),
  "hoodie-cream.svg": scene(P.peach, figure(kinako, { outfit: "#fff1d6", hoodColor: { color: "#fff1d6", shade: "#ead6b0" } })),
  "hoodie-pink.svg": scene(P.rose, figure(kinako, { outfit: "#ffc6d6", hoodColor: { color: "#ffc6d6", shade: "#f0a3b9" } })),
  "hoodie-grey.svg": scene(P.sky, figure(kinako, { outfit: "#d5d9e2", hoodColor: { color: "#d5d9e2", shade: "#b4bac7" } })),
  "hero.svg": scene(
    { bg: ["#ffffff00", "#ffffff00"], accent: "#fe2c55" },
    group([figure(kinako, { tilt: 6 }), figure(fern), figure(frieren, { prop: "staff" }), figure(stark, { tilt: -6 })]),
  ),
};

for (const [name, svg] of Object.entries(files)) {
  writeFileSync(path.join(OUT, name), svg.replace(/\n\s+/g, "\n"));
}
console.log(`Wrote ${Object.keys(files).length} illustrations to ${OUT}`);

// favicon.ico (16/32/48 px PNGs in an ICO container) rendered from the app icon. Browsers request
// /favicon.ico even when an SVG icon is declared.
const { default: sharp } = await import("sharp");
const iconSvg = path.join(import.meta.dirname, "..", "src", "app", "icon.svg");
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map((s) => sharp(iconSvg, { density: 384 }).resize(s, s).png().toBuffer()));
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
writeFileSync(path.join(import.meta.dirname, "..", "src", "app", "favicon.ico"), Buffer.concat([header, ...pngs]));
console.log("Wrote src/app/favicon.ico");
