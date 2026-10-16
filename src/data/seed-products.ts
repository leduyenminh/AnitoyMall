import type { Product } from "@/lib/types";

// Starter catalog modelled on the figures featured on @leduyenminh's TikTok.
//
// PLACEHOLDER DATA: prices, stock and descriptions are illustrative. Connect TikTok Shop in /admin
// and run a sync; synced listings replace these and seed items are archived automatically.
// Compare-at prices are only set on bundles, where they equal the sum of the individual items.

const CREATED = "2026-04-01T00:00:00.000Z";

type SeedInput = Omit<Product, "status" | "source" | "createdAt" | "updatedAt" | "tags"> & {
  tags?: string[];
};

const seed = (p: SeedInput): Product => ({
  status: "active",
  source: "seed",
  createdAt: CREATED,
  updatedAt: CREATED,
  tags: [],
  ...p,
});

const mini = (extra: Product["attributes"] = []) => [
  { name: "Chiều cao", value: "10 cm" },
  { name: "Chất liệu", value: "Nhựa PVC" },
  { name: "Đầu xoay được", value: "Có" },
  ...extra,
];
const miniEn = (extra: Product["attributes"] = []) => [
  { name: "Height", value: "10 cm" },
  { name: "Material", value: "PVC" },
  { name: "Rotating head", value: "Yes" },
  ...extra,
];
const big = [
  { name: "Chiều cao", value: "20 cm" },
  { name: "Chất liệu", value: "Nhựa PVC" },
  { name: "Đế trưng bày", value: "Có" },
];
const bigEn = [
  { name: "Height", value: "20 cm" },
  { name: "Material", value: "PVC" },
  { name: "Display base", value: "Included" },
];

export const seedProducts: Product[] = [
  seed({
    id: "seed-frieren-mini",
    slug: "frieren-mini-figure-10cm",
    title: "Mô hình Frieren mini 10cm – Pháp sư tiễn táng",
    description:
      "Nàng pháp sư elf Frieren phiên bản chibi tròn xoe, cao 10cm, đầu xoay được.\n\nDecor góc học tập, bàn làm việc cực chill – chữa lành sau một ngày dài.",
    i18n: {
      en: {
        title: "Frieren Mini Figure 10cm – Beyond Journey's End",
        description:
          "A round, chibi-style Frieren the elf mage, 10cm tall with a rotating head.\n\nThe perfect calming companion for your desk or study corner.",
        attributes: miniEn(),
        skuNames: { "seed-frieren-mini-std": "Standing", "seed-frieren-mini-chill": "Chill pose" },
      },
    },
    images: ["/art/frieren-mini-1.svg", "/art/frieren-mini-2.svg"],
    collection: "frieren",
    category: "mini",
    tags: ["frieren", "sousou no frieren", "chibi", "decor"],
    attributes: mini(),
    skus: [
      { id: "seed-frieren-mini-std", name: "Dáng đứng", price: 79000, stock: 24, image: "/art/frieren-mini-1.svg" },
      { id: "seed-frieren-mini-chill", name: "Dáng chill", price: 79000, stock: 4, image: "/art/frieren-mini-2.svg" },
    ],
    tiktokVideoIds: ["7549993146407472404", "7674564950177746184", "7633457885283962130"],
    featured: 100,
  }),
  seed({
    id: "seed-fern-mini",
    slug: "fern-mini-figure-10cm",
    title: "Mô hình Fern mini 10cm – Pháp sư Fern",
    description:
      "Fern cute tròn xoe 10cm, học trò của Frieren. Đầu xoay được, chất liệu PVC bền đẹp.\n\nGom đủ bộ ba thầy trò để trang trí góc học tập nhé!",
    i18n: {
      en: {
        title: "Fern Mini Figure 10cm",
        description:
          "A round and adorable 10cm Fern, Frieren's apprentice. Rotating head, durable PVC.\n\nCollect the whole party for your desk!",
        attributes: miniEn(),
      },
    },
    images: ["/art/fern-mini-1.svg", "/art/fern-mini-2.svg"],
    collection: "frieren",
    category: "mini",
    tags: ["fern", "frieren", "chibi"],
    attributes: mini(),
    skus: [{ id: "seed-fern-mini-std", name: "Tiêu chuẩn", price: 79000, stock: 18 }],
    tiktokVideoIds: ["7674562947850521876", "7656321056503811348"],
    featured: 90,
  }),
  seed({
    id: "seed-stark-mini",
    slug: "stark-mini-figure-10cm",
    title: "Mô hình Stark mini 10cm – Chiến binh Stark",
    description:
      "Chiến binh Stark tóc đỏ phiên bản mini 10cm, đầu xoay được.\n\nCó dáng đứng và dáng chill để bạn tha hồ phối cảnh.",
    i18n: {
      en: {
        title: "Stark Mini Figure 10cm – The Warrior",
        description:
          "Red-haired warrior Stark as a 10cm mini figure with a rotating head.\n\nAvailable in standing and chill poses.",
        attributes: miniEn(),
        skuNames: { "seed-stark-mini-std": "Standing", "seed-stark-mini-chill": "Chill pose" },
      },
    },
    images: ["/art/stark-mini-1.svg", "/art/stark-mini-2.svg"],
    collection: "frieren",
    category: "mini",
    tags: ["stark", "frieren", "chibi"],
    attributes: mini(),
    skus: [
      { id: "seed-stark-mini-std", name: "Dáng đứng", price: 79000, stock: 15, image: "/art/stark-mini-1.svg" },
      { id: "seed-stark-mini-chill", name: "Dáng chill", price: 79000, stock: 9, image: "/art/stark-mini-2.svg" },
    ],
    tiktokVideoIds: ["7656326591559044360", "7657157899403283720", "7674564397632703765"],
    featured: 80,
  }),
  seed({
    id: "seed-frieren-trio",
    slug: "frieren-fern-stark-trio-set",
    title: "Combo 3 thầy trò Frieren · Fern · Stark 10cm",
    description:
      "Trọn bộ ba thầy trò Frieren, Fern và Stark phiên bản mini 10cm – rẻ hơn mua lẻ.\n\nQuà tặng tuyệt vời cho fan Sousou no Frieren.",
    i18n: {
      en: {
        title: "Frieren · Fern · Stark Trio Set 10cm",
        description:
          "The whole party – Frieren, Fern and Stark – as 10cm mini figures, for less than buying them separately.\n\nA perfect gift for any Frieren fan.",
        attributes: miniEn([{ name: "Includes", value: "3 figures" }]),
      },
    },
    images: ["/art/trio-1.svg", "/art/trio-2.svg"],
    collection: "frieren",
    category: "set",
    tags: ["combo", "bundle", "frieren", "fern", "stark", "gift"],
    attributes: mini([{ name: "Bộ gồm", value: "3 mô hình" }]),
    skus: [{ id: "seed-frieren-trio-std", name: "Combo 3", price: 219000, compareAtPrice: 237000, stock: 12 }],
    tiktokVideoIds: ["7633679526999903495", "7627760395935091989", "7633031631548189960"],
    featured: 95,
  }),
  seed({
    id: "seed-fern-stark-duo",
    slug: "fern-stark-duo-set",
    title: "Combo cặp đôi Fern & Stark 10cm",
    description: "Cặp đôi Fern và Stark trong bộ ba thầy trò Frieren, phiên bản mini 10cm.",
    i18n: {
      en: {
        title: "Fern & Stark Duo Set 10cm",
        description: "Fern and Stark from Frieren's party as a pair of 10cm mini figures.",
        attributes: miniEn([{ name: "Includes", value: "2 figures" }]),
      },
    },
    images: ["/art/duo-1.svg"],
    collection: "frieren",
    category: "set",
    tags: ["combo", "fern", "stark", "gift"],
    attributes: mini([{ name: "Bộ gồm", value: "2 mô hình" }]),
    skus: [{ id: "seed-fern-stark-duo-std", name: "Combo 2", price: 149000, compareAtPrice: 158000, stock: 10 }],
    tiktokVideoIds: ["7632734394762939668"],
    featured: 60,
  }),
  seed({
    id: "seed-frieren-20cm",
    slug: "frieren-figure-20cm",
    title: "Mô hình Frieren 20cm – Pháp sư tiễn táng",
    description:
      "Nàng Frieren 20cm chi tiết sắc nét, kèm đế trưng bày.\n\nSeason 2 đã bắt đầu – trang trí góc làm việc bằng nàng Frieren ngay hôm nay.",
    i18n: {
      en: {
        title: "Frieren Figure 20cm – Beyond Journey's End",
        description:
          "A detailed 20cm Frieren figure with display base.\n\nSeason 2 is here – give your workspace some elven magic.",
        attributes: bigEn,
      },
    },
    images: ["/art/frieren-20cm-1.svg", "/art/frieren-20cm-2.svg"],
    collection: "frieren",
    category: "figure",
    tags: ["frieren", "figure", "20cm"],
    attributes: big,
    skus: [{ id: "seed-frieren-20cm-std", name: "Tiêu chuẩn", price: 289000, stock: 7 }],
    tiktokVideoIds: ["7621226947661548801"],
    featured: 85,
  }),
  seed({
    id: "seed-frieren-flowers",
    slug: "frieren-flower-bouquet-figure-20cm",
    title: "Mô hình Frieren ôm hoa tưởng nhớ Himmel 20cm",
    description:
      "Frieren ôm đóa hoa tưởng nhớ Himmel – khoảnh khắc đáng nhớ nhất của series, cao 20cm, hoàn thiện chi tiết.",
    i18n: {
      en: {
        title: "Frieren with Flower Bouquet Figure 20cm",
        description:
          "Frieren holding flowers in memory of Himmel – the series' most moving moment, as a detailed 20cm figure.",
        attributes: bigEn,
      },
    },
    images: ["/art/frieren-flowers-1.svg", "/art/frieren-flowers-2.svg"],
    collection: "frieren",
    category: "figure",
    tags: ["frieren", "himmel", "figure", "20cm", "gift"],
    attributes: big,
    skus: [{ id: "seed-frieren-flowers-std", name: "Tiêu chuẩn", price: 329000, stock: 3 }],
    tiktokVideoIds: ["7618627305706900757", "7619409900178803969"],
    featured: 98,
  }),
  seed({
    id: "seed-osakana-neko",
    slug: "osakana-neko-figure-20cm",
    title: "Mô hình Osakana Neko 20cm ôm cá khổng lồ",
    description:
      "My cat is a kawaii girl – Neko-chan 20cm ôm con cá khổng lồ, không nhựa thừa, màu sắc tươi tắn.\n\nĐiểm nhấn siêu cute cho góc học tập.",
    i18n: {
      en: {
        title: "Osakana Neko Figure 20cm with Giant Fish",
        description:
          "My Cat Is a Kawaii Girl – a 20cm neko-chan hugging a giant fish, cleanly finished with bright colours.\n\nAn adorable centrepiece for any desk.",
        attributes: bigEn,
      },
    },
    images: ["/art/osakana-1.svg", "/art/osakana-2.svg"],
    collection: "neko",
    category: "figure",
    tags: ["neko", "kinako", "osakana", "cat girl", "20cm"],
    attributes: big,
    skus: [{ id: "seed-osakana-neko-std", name: "Tiêu chuẩn", price: 259000, stock: 11 }],
    tiktokVideoIds: ["7621236910488440071", "7620485098479127828", "7620836995979398421", "7614891907692383495"],
    featured: 92,
  }),
  seed({
    id: "seed-neko-hoodie",
    slug: "neko-hoodie-mini-figure",
    title: "Mô hình Neko mặc áo trùm mini",
    description:
      "Neko mặc áo trùm tai mèo siêu cute, siêu nét – decor bàn học, bàn làm việc.\n\nCó 3 màu áo để lựa chọn.",
    i18n: {
      en: {
        title: "Neko Hoodie Mini Figure",
        description: "A super cute neko in a cat-ear hoodie, crisp details – a desk buddy in three hoodie colours.",
        attributes: [
          { name: "Height", value: "10 cm" },
          { name: "Material", value: "PVC" },
        ],
        skuNames: {
          "seed-neko-hoodie-cream": "Cream",
          "seed-neko-hoodie-pink": "Pink",
          "seed-neko-hoodie-grey": "Grey",
        },
      },
    },
    images: ["/art/hoodie-cream.svg", "/art/hoodie-pink.svg", "/art/hoodie-grey.svg"],
    collection: "neko",
    category: "mini",
    tags: ["neko", "hoodie", "mini"],
    attributes: [
      { name: "Chiều cao", value: "10 cm" },
      { name: "Chất liệu", value: "Nhựa PVC" },
    ],
    skus: [
      { id: "seed-neko-hoodie-cream", name: "Kem", price: 69000, stock: 20, image: "/art/hoodie-cream.svg" },
      { id: "seed-neko-hoodie-pink", name: "Hồng", price: 69000, stock: 2, image: "/art/hoodie-pink.svg" },
      { id: "seed-neko-hoodie-grey", name: "Xám", price: 69000, stock: 0, image: "/art/hoodie-grey.svg" },
    ],
    tiktokVideoIds: ["7621217028191341845"],
    featured: 70,
  }),
  seed({
    id: "seed-kinako-neko",
    slug: "kinako-neko-figure",
    title: "Mô hình Neko Kinako – My cat is a kawaii girl",
    description: "Figure neko Kinako đáng yêu từ series My cat is a kawaii girl.",
    i18n: {
      en: {
        title: "Kinako Neko Figure – My Cat Is a Kawaii Girl",
        description: "An adorable Kinako neko figure from My Cat Is a Kawaii Girl.",
        attributes: [
          { name: "Height", value: "15 cm" },
          { name: "Material", value: "PVC" },
        ],
      },
    },
    images: ["/art/kinako-1.svg", "/art/kinako-2.svg"],
    collection: "neko",
    category: "figure",
    tags: ["kinako", "neko", "cat girl"],
    attributes: [
      { name: "Chiều cao", value: "15 cm" },
      { name: "Chất liệu", value: "Nhựa PVC" },
    ],
    skus: [{ id: "seed-kinako-neko-std", name: "Tiêu chuẩn", price: 199000, stock: 0 }],
    tiktokVideoIds: ["7492968606561537281"],
    featured: 50,
  }),
];
