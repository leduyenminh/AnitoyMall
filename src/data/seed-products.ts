import type { Product, ProductAttribute } from "@/lib/types";
import { coverPhoto } from "./tiktok-videos";

// Starter catalog built from the products shown in @leduyenminh's TikTok videos. Photos are the
// shop's own video covers; each product links the videos that feature it.
//
// PLACEHOLDER COMMERCE DATA: prices and stock are illustrative (older lines are shown as sold
// out). Connect TikTok Shop in /admin and run a sync: synced listings replace these, and seed
// items are archived automatically. Compare-at prices are only set on bundles, where they equal
// the sum of the individual items.

const CREATED = "2026-04-01T00:00:00.000Z";

type SeedInput = Omit<Product, "status" | "source" | "createdAt" | "updatedAt" | "featured"> & {
  featured?: number;
  createdAt?: string;
};

const seed = ({ createdAt = CREATED, featured = 0, ...p }: SeedInput): Product => ({
  status: "active",
  source: "seed",
  createdAt,
  updatedAt: createdAt,
  featured,
  ...p,
});

const attrs = (height: string, extra: ProductAttribute[] = []): ProductAttribute[] => [
  { name: "Chiều cao", value: height },
  { name: "Chất liệu", value: "Nhựa PVC" },
  ...extra,
];
const attrsEn = (height: string, extra: ProductAttribute[] = []): ProductAttribute[] => [
  { name: "Height", value: height },
  { name: "Material", value: "PVC" },
  ...extra,
];

/** One SKU per character, with the cover that shows that character. */
const characterSkus = (
  prefix: string,
  price: number,
  stock: number,
  characters: [name: string, coverVideoId?: string][],
) =>
  characters.map(([name, video]) => ({
    id: `${prefix}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name,
    price,
    stock,
    ...(video ? { image: coverPhoto(video) } : {}),
  }));

export const seedProducts: Product[] = [
  // ------------------------------------------------------------------ Frieren
  seed({
    id: "seed-frieren-chibi",
    slug: "frieren-chibi-figure-10cm",
    title: "Mô hình Frieren chibi 10cm khớp xoay đầu",
    description:
      "Nàng pháp sư elf Frieren phiên bản chibi tròn xoe, cao 10cm, đầu xoay được, nhựa PVC.\n\nDecor góc học tập, bàn làm việc cực chill – chữa lành sau một ngày dài.",
    i18n: {
      en: {
        title: "Frieren Chibi Figure 10cm (rotating head)",
        description:
          "A round chibi Frieren the elf mage, 10cm tall with a rotating head, in PVC.\n\nThe calmest companion for your desk or study corner.",
        attributes: attrsEn("10 cm", [{ name: "Rotating head", value: "Yes" }]),
      },
    },
    images: [coverPhoto("7674564950177746184"), coverPhoto("7674565388323081493"), coverPhoto("7594160266502229249"), coverPhoto("7553301852889074960")],
    collection: "frieren",
    category: "mini",
    tags: ["frieren", "sousou no frieren", "chibi", "decor"],
    attributes: attrs("10 cm", [{ name: "Đầu xoay được", value: "Có" }]),
    skus: [{ id: "seed-frieren-chibi-std", name: "Tiêu chuẩn", price: 79000, stock: 24 }],
    tiktokVideoIds: ["7553301852889074960", "7594160266502229249", "7674564950177746184", "7674565388323081493"],
    featured: 100,
    createdAt: "2026-10-10T00:00:00.000Z",
  }),
  seed({
    id: "seed-fern-chibi",
    slug: "fern-chibi-figure-10cm",
    title: "Mô hình Fern chibi 10cm khớp xoay đầu",
    description:
      "Fern cute tròn xoe 10cm, học trò của Frieren. Đầu xoay được, nhựa PVC bền đẹp.\n\nGom đủ bộ ba thầy trò để trang trí góc học tập nhé!",
    i18n: {
      en: {
        title: "Fern Chibi Figure 10cm (rotating head)",
        description: "A round and adorable 10cm Fern, Frieren's apprentice. Rotating head, durable PVC.\n\nCollect the whole party for your desk!",
        attributes: attrsEn("10 cm", [{ name: "Rotating head", value: "Yes" }]),
      },
    },
    images: [coverPhoto("7674562947850521876"), coverPhoto("7633031631548189960"), coverPhoto("7656322520693411092"), coverPhoto("7656321056503811348")],
    collection: "frieren",
    category: "mini",
    tags: ["fern", "frieren", "chibi"],
    attributes: attrs("10 cm", [{ name: "Đầu xoay được", value: "Có" }]),
    skus: [{ id: "seed-fern-chibi-std", name: "Tiêu chuẩn", price: 79000, stock: 18 }],
    tiktokVideoIds: ["7656322520693411092", "7656321056503811348", "7674562947850521876"],
    featured: 90,
    createdAt: "2026-09-20T00:00:00.000Z",
  }),
  seed({
    id: "seed-stark-chibi",
    slug: "stark-chibi-figure-10cm",
    title: "Mô hình Stark chibi 10cm khớp xoay đầu",
    description: "Chiến binh Stark tóc đỏ phiên bản chibi 10cm, đầu xoay được, nhựa PVC.\n\nĐứng cạnh Frieren và Fern là đủ bộ ba thầy trò.",
    i18n: {
      en: {
        title: "Stark Chibi Figure 10cm (rotating head)",
        description: "Red-haired warrior Stark as a 10cm chibi with a rotating head, in PVC.\n\nPair him with Frieren and Fern to complete the party.",
        attributes: attrsEn("10 cm", [{ name: "Rotating head", value: "Yes" }]),
      },
    },
    images: [coverPhoto("7657157899403283720"), coverPhoto("7656326591559044360"), coverPhoto("7674564397632703765")],
    collection: "frieren",
    category: "mini",
    tags: ["stark", "frieren", "chibi"],
    attributes: attrs("10 cm", [{ name: "Đầu xoay được", value: "Có" }]),
    skus: [{ id: "seed-stark-chibi-std", name: "Tiêu chuẩn", price: 79000, stock: 4 }],
    tiktokVideoIds: ["7657157899403283720", "7656326591559044360", "7674564397632703765"],
    featured: 80,
    createdAt: "2026-09-20T00:00:00.000Z",
  }),
  seed({
    id: "seed-frieren-trio",
    slug: "frieren-fern-stark-trio-set",
    title: "Combo 3 thầy trò Frieren · Fern · Stark 10cm",
    description:
      "Trọn bộ ba thầy trò Frieren, Fern và Stark phiên bản chibi 10cm – rẻ hơn mua lẻ.\n\nQuà tặng tuyệt vời cho fan Sousou no Frieren.",
    i18n: {
      en: {
        title: "Frieren · Fern · Stark Trio Set 10cm",
        description:
          "The whole party – Frieren, Fern and Stark – as 10cm chibi figures, for less than buying them separately.\n\nA perfect gift for any Frieren fan.",
        attributes: attrsEn("10 cm", [{ name: "Includes", value: "3 figures" }]),
      },
    },
    images: [coverPhoto("7627760395935091989"), coverPhoto("7632650329791794439"), coverPhoto("7633679526999903495")],
    collection: "frieren",
    category: "set",
    tags: ["combo", "bundle", "frieren", "fern", "stark", "gift"],
    attributes: attrs("10 cm", [{ name: "Bộ gồm", value: "3 mô hình" }]),
    skus: [{ id: "seed-frieren-trio-std", name: "Combo 3", price: 219000, compareAtPrice: 237000, stock: 12 }],
    tiktokVideoIds: ["7627760395935091989", "7633031631548189960", "7632538479074741511", "7633679526999903495", "7632650329791794439"],
    featured: 95,
  }),
  seed({
    id: "seed-fern-stark-duo",
    slug: "fern-stark-duo-set",
    title: "Combo cặp đôi Fern & Stark 10cm",
    description: "Cặp đôi Fern và Stark trong bộ ba thầy trò Frieren, phiên bản chibi 10cm.",
    i18n: {
      en: {
        title: "Fern & Stark Duo Set 10cm",
        description: "Fern and Stark from Frieren's party as a pair of 10cm chibi figures.",
        attributes: attrsEn("10 cm", [{ name: "Includes", value: "2 figures" }]),
      },
    },
    images: [coverPhoto("7632734394762939668")],
    collection: "frieren",
    category: "set",
    tags: ["combo", "fern", "stark", "gift"],
    attributes: attrs("10 cm", [{ name: "Bộ gồm", value: "2 mô hình" }]),
    skus: [{ id: "seed-fern-stark-duo-std", name: "Combo 2", price: 149000, compareAtPrice: 158000, stock: 10 }],
    tiktokVideoIds: ["7632734394762939668"],
    featured: 60,
  }),
  seed({
    id: "seed-frieren-20cm",
    slug: "frieren-flower-figure-20cm",
    title: "Mô hình Frieren 20cm ôm hoa – có đế",
    description:
      "Frieren ôm đóa hoa tưởng nhớ Himmel – khoảnh khắc đáng nhớ nhất của series. Cao 20cm, chi tiết hoàn thiện, có đế trưng bày (no box).\n\nSeason 2 đã bắt đầu – trang trí góc làm việc bằng nàng Frieren ngay hôm nay.",
    i18n: {
      en: {
        title: "Frieren 20cm Figure with Flowers (with base)",
        description:
          "Frieren holding flowers in memory of Himmel – the series' most moving moment. 20cm tall, finely finished, with display base (no box).\n\nSeason 2 is here – give your desk some elven magic.",
        attributes: attrsEn("20 cm", [{ name: "Display base", value: "Included (no box)" }]),
      },
    },
    images: [
      coverPhoto("7618627305706900757"),
      coverPhoto("7619409900178803969"),
      coverPhoto("7597853119460019477"),
      coverPhoto("7613067330490322184"),
      coverPhoto("7621226947661548801"),
    ],
    collection: "frieren",
    category: "figure",
    tags: ["frieren", "himmel", "figure", "20cm", "gift"],
    attributes: attrs("20 cm", [{ name: "Đế trưng bày", value: "Có (no box)" }]),
    skus: [{ id: "seed-frieren-20cm-std", name: "Tiêu chuẩn", price: 329000, stock: 7 }],
    tiktokVideoIds: [
      "7621226947661548801",
      "7618627305706900757",
      "7611820025145478420",
      "7597853119460019477",
      "7619409900178803969",
      "7613067330490322184",
      "7611009561905925384",
    ],
    featured: 98,
  }),
  seed({
    id: "seed-frieren-gold",
    slug: "frieren-mini-figure-gold-11cm",
    title: "Mô hình Frieren mini 11cm nhũ vàng – đầu xoay",
    description:
      "Frieren mini 11cm với chi tiết nhũ vàng trên áo choàng, đầu xoay được.\n\nHợp không gian chill & healing – decor bàn học, bàn làm việc.",
    i18n: {
      en: {
        title: "Frieren Mini Figure 11cm with Gold Details",
        description: "An 11cm Frieren mini with gold-accented cloak and a rotating head.\n\nMade for a calm, healing desk vibe.",
        attributes: attrsEn("11 cm", [{ name: "Rotating head", value: "Yes" }]),
      },
    },
    images: [
      coverPhoto("7515783406832356615"),
      coverPhoto("7531591983840759047"),
      coverPhoto("7517823152458665223"),
      coverPhoto("7513020234454895879"),
      coverPhoto("7536273814301183239"),
    ],
    collection: "frieren",
    category: "mini",
    tags: ["frieren", "mini", "gold"],
    attributes: attrs("11 cm", [{ name: "Đầu xoay được", value: "Có" }]),
    skus: [{ id: "seed-frieren-gold-std", name: "Tiêu chuẩn", price: 99000, stock: 2 }],
    tiktokVideoIds: [
      "7549993146407472404",
      "7527101479904103696",
      "7581162734172130580",
      "7536273814301183239",
      "7586734408854473985",
      "7537853071469202709",
      "7588433330534698248",
      "7528781074755898642",
      "7513020234454895879",
      "7517823152458665223",
      "7531591983840759047",
      "7515783406832356615",
      "7633457885283962130",
    ],
    featured: 85,
    createdAt: "2025-07-01T00:00:00.000Z",
  }),
  seed({
    id: "seed-frieren-keychain",
    slug: "frieren-acrylic-keychain",
    title: "Móc khoá acrylic 2 mặt Frieren · Fern · Himmel · Stark",
    description: "Móc khoá acrylic cao cấp in 2 mặt, nhân vật Frieren Beyond Journey's End.",
    i18n: {
      en: {
        title: "Frieren Double-sided Acrylic Keychain",
        description: "Premium double-sided acrylic keychains from Frieren: Beyond Journey's End.",
        attributes: [{ name: "Material", value: "Acrylic" }],
      },
    },
    images: [coverPhoto("7515785628425161991"), coverPhoto("7485802326825913605")],
    collection: "frieren",
    category: "accessory",
    tags: ["keychain", "móc khoá", "acrylic", "frieren"],
    attributes: [{ name: "Chất liệu", value: "Acrylic" }],
    skus: characterSkus("seed-frieren-keychain", 35000, 0, [["Frieren"], ["Fern"], ["Himmel"], ["Stark"]]),
    tiktokVideoIds: ["7485802326825913605", "7515785628425161991"],
    createdAt: "2025-03-20T00:00:00.000Z",
  }),

  // ------------------------------------------------------------------ Neko Kawaii
  seed({
    id: "seed-osakana-20cm",
    slug: "osakana-neko-figure-20cm",
    title: "Mô hình Osakana Neko 20cm ôm cá khổng lồ",
    description:
      "My cat is a kawaii girl – Osakana Neko 20cm đứng ôm con cá khổng lồ, không nhựa thừa, màu sắc tươi tắn.\n\nĐiểm nhấn siêu cute cho góc học tập.",
    i18n: {
      en: {
        title: "Osakana Neko Figure 20cm with Giant Fish",
        description:
          "My Cat Is a Kawaii Girl – a 20cm standing Osakana Neko hugging a giant fish, cleanly finished in bright colours.\n\nAn adorable centrepiece for any desk.",
        attributes: attrsEn("20 cm"),
      },
    },
    images: [coverPhoto("7620485098479127828"), coverPhoto("7620836995979398421"), coverPhoto("7518794555769048327"), coverPhoto("7518640842546924808")],
    collection: "neko",
    category: "figure",
    tags: ["neko", "osakana", "kinako", "cat girl", "20cm"],
    attributes: attrs("20 cm"),
    skus: [{ id: "seed-osakana-20cm-std", name: "Tiêu chuẩn", price: 259000, stock: 11 }],
    tiktokVideoIds: ["7620485098479127828", "7518640842546924808", "7620836995979398421", "7614891907692383495", "7518794555769048327"],
    featured: 92,
  }),
  seed({
    id: "seed-osakana-sitting",
    slug: "osakana-neko-chan-sitting-figure",
    title: "Mô hình Osakana neko-chan dáng ngồi",
    description: "My cat is a kawaii girl – Osakana neko-chan dáng ngồi đã quay trở lại và lợi hại hơn xưa.",
    i18n: {
      en: {
        title: "Osakana Neko-chan Sitting Figure",
        description: "My Cat Is a Kawaii Girl – the sitting Osakana neko-chan is back and cuter than ever.",
        attributes: attrsEn("20 cm"),
      },
    },
    images: [coverPhoto("7621236910488440071"), coverPhoto("7621218499368733972")],
    collection: "neko",
    category: "figure",
    tags: ["neko", "osakana", "cat girl"],
    attributes: attrs("20 cm"),
    skus: [{ id: "seed-osakana-sitting-std", name: "Tiêu chuẩn", price: 239000, stock: 9 }],
    tiktokVideoIds: ["7621236910488440071", "7621218499368733972"],
    featured: 88,
  }),
  seed({
    id: "seed-osakana-12cm",
    slug: "osakana-neko-figure-12cm",
    title: "Mô hình neko Osakana 12cm",
    description: "Bé neko Osakana 12cm vừa chữa lành vừa cực cháy, trang trí góc làm việc rất chill.",
    i18n: {
      en: {
        title: "Osakana Neko Figure 12cm",
        description: "A 12cm Osakana neko – soothing and stylish, perfect for a chill desk corner.",
        attributes: attrsEn("12 cm"),
      },
    },
    images: [coverPhoto("7557246821714693377"), coverPhoto("7492968606561537281"), coverPhoto("7555214243209956628")],
    collection: "neko",
    category: "mini",
    tags: ["neko", "osakana", "kinako", "12cm"],
    attributes: attrs("12 cm"),
    skus: [{ id: "seed-osakana-12cm-std", name: "Tiêu chuẩn", price: 149000, stock: 0 }],
    tiktokVideoIds: [
      "7555214243209956628",
      "7557246821714693377",
      "7492968606561537281",
      "7478384002714373382",
      "7495648865081642261",
      "7499137968263810325",
    ],
    featured: 40,
    createdAt: "2025-04-01T00:00:00.000Z",
  }),
  seed({
    id: "seed-kinako-coat",
    slug: "kinako-neko-purple-coat-10cm",
    title: "Mô hình Kinako neko áo trùm tím dáng ngồi 10cm",
    description:
      "Cô gái tai mèo Kinako mặc áo trùm tím dáng ngồi, cao 10cm – nhỏ hơn đàn chị xíu nhưng siêu cute, siêu nét.\n\nPhù hợp cho góc decor chill.",
    i18n: {
      en: {
        title: "Kinako Neko in Purple Coat, Sitting 10cm",
        description: "Cat-eared Kinako sitting in a purple hooded coat, 10cm tall – small, crisp and super cute.\n\nPerfect for a cosy desk corner.",
        attributes: attrsEn("10 cm"),
      },
    },
    images: [coverPhoto("7555219159605447953"), coverPhoto("7555210852991847700"), coverPhoto("7621217028191341845"), coverPhoto("7555213325857066260")],
    collection: "neko",
    category: "mini",
    tags: ["neko", "kinako", "hoodie", "coat", "cat girl"],
    attributes: attrs("10 cm"),
    skus: [{ id: "seed-kinako-coat-std", name: "Tiêu chuẩn", price: 129000, stock: 6 }],
    tiktokVideoIds: ["7621217028191341845", "7555213325857066260", "7555219159605447953", "7555210852991847700"],
    featured: 75,
  }),

  // ------------------------------------------------------------------ Kimetsu no Yaiba
  seed({
    id: "seed-kimetsu-12cm",
    slug: "kimetsu-no-yaiba-figure-12cm",
    title: "Mô hình Kimetsu no Yaiba 12cm – Tanjirou, Nezuko, Zenitsu, Inosuke, Shinobu, Giyu",
    description: "Mô hình nhân vật Thanh gươm diệt quỷ (Demon Slayer) cao khoảng 12cm, nhiều nhân vật để lựa chọn.",
    i18n: {
      en: {
        title: "Demon Slayer (Kimetsu no Yaiba) Figures 12cm",
        description: "Demon Slayer character figures, about 12cm tall – choose your favourite.",
        attributes: attrsEn("12 cm"),
      },
    },
    images: [
      coverPhoto("7499143655727336722"),
      coverPhoto("7531592617755184391"),
      coverPhoto("7531592805370563847"),
      coverPhoto("7507422443791846663"),
      coverPhoto("7560030663039094037"),
      coverPhoto("7505300468239715605"),
    ],
    collection: "kimetsu",
    category: "mini",
    tags: ["kimetsu no yaiba", "demon slayer", "tanjirou", "nezuko", "zenitsu", "inosuke", "shinobu", "giyu"],
    attributes: attrs("12 cm"),
    skus: characterSkus("seed-kimetsu", 99000, 0, [
      ["Tanjirou", "7560030663039094037"],
      ["Nezuko", "7531592805370563847"],
      ["Zenitsu", "7531592617755184391"],
      ["Inosuke", "7507422443791846663"],
      ["Shinobu", "7499143655727336722"],
      ["Giyu", "7505300468239715605"],
    ]),
    tiktokVideoIds: [
      "7499143655727336722",
      "7531592617755184391",
      "7507422443791846663",
      "7506330873042586898",
      "7505300468239715605",
      "7531592805370563847",
      "7560030663039094037",
      "7571146763508141330",
      "7509523638320696594",
      "7571146172530691349",
      "7507834221172362503",
    ],
    featured: 30,
    createdAt: "2025-05-01T00:00:00.000Z",
  }),

  // ------------------------------------------------------------------ More anime & games
  seed({
    id: "seed-hsr-strap",
    slug: "honkai-star-rail-phone-strap",
    title: "Dây đeo điện thoại Honkai Star Rail",
    description: "Dây đeo điện thoại nhân vật Honkai Star Rail: Silver Wolf, Kafka, Dan Heng, Jing Yuan, Yanqing, Blade.",
    i18n: {
      en: {
        title: "Honkai: Star Rail Phone Strap",
        description: "Phone straps featuring Honkai: Star Rail characters: Silver Wolf, Kafka, Dan Heng, Jing Yuan, Yanqing and Blade.",
        attributes: [{ name: "Type", value: "Phone strap" }],
      },
    },
    images: [coverPhoto("7492967986047864085"), coverPhoto("7489718987454942470")],
    collection: "more",
    category: "accessory",
    tags: ["honkai star rail", "hsr", "phone strap", "dây đeo"],
    attributes: [{ name: "Loại", value: "Dây đeo điện thoại" }],
    skus: characterSkus("seed-hsr-strap", 39000, 0, [["Silver Wolf"], ["Kafka"], ["Dan Heng"], ["Jing Yuan"], ["Yanqing"], ["Blade"]]),
    tiktokVideoIds: ["7489718987454942470", "7492967986047864085"],
    createdAt: "2025-03-25T00:00:00.000Z",
  }),
  seed({
    id: "seed-hsr-standee",
    slug: "honkai-star-rail-acrylic-standee",
    title: "Standee acrylic Honkai Star Rail – Robin, Kafka, Silver Wolf",
    description: "Standee acrylic nhân vật Honkai Star Rail để bàn: Robin, Kafka và Silver Wolf.",
    i18n: {
      en: {
        title: "Honkai: Star Rail Acrylic Standee",
        description: "Desk acrylic standees of Robin, Kafka and Silver Wolf from Honkai: Star Rail.",
        attributes: [{ name: "Material", value: "Acrylic" }],
      },
    },
    images: [coverPhoto("7484071785730772229")],
    collection: "more",
    category: "accessory",
    tags: ["honkai star rail", "standee", "robin", "kafka", "silver wolf"],
    attributes: [{ name: "Chất liệu", value: "Acrylic" }],
    skus: characterSkus("seed-hsr-standee", 59000, 0, [["Robin"], ["Kafka"], ["Silver Wolf"]]),
    tiktokVideoIds: ["7484071785730772229"],
    createdAt: "2025-03-20T00:00:00.000Z",
  }),
  seed({
    id: "seed-genshin-keychain",
    slug: "genshin-impact-acrylic-keychain",
    title: "Móc khoá acrylic Genshin Impact",
    description: "Móc khoá acrylic nhân vật Genshin Impact.",
    i18n: {
      en: {
        title: "Genshin Impact Acrylic Keychain",
        description: "Acrylic keychains featuring Genshin Impact characters.",
        attributes: [{ name: "Material", value: "Acrylic" }],
      },
    },
    images: [coverPhoto("7478866157714296069")],
    collection: "more",
    category: "accessory",
    tags: ["genshin impact", "keychain", "móc khoá"],
    attributes: [{ name: "Chất liệu", value: "Acrylic" }],
    skus: [{ id: "seed-genshin-keychain-std", name: "Tiêu chuẩn", price: 35000, stock: 0 }],
    tiktokVideoIds: ["7478866157714296069"],
    createdAt: "2025-03-10T00:00:00.000Z",
  }),
  seed({
    id: "seed-chainsaw-mini",
    slug: "chainsaw-man-mini-figure",
    title: "Mô hình Chainsaw Man mini – Denji, Power, Aki, Makima",
    description: "Mô hình mini Chainsaw Man siêu cute: Denji, Power, Aki và Makima (9cm).",
    i18n: {
      en: {
        title: "Chainsaw Man Mini Figures",
        description: "Cute Chainsaw Man minis: Denji, Power, Aki and Makima (9cm).",
        attributes: attrsEn("9 cm"),
      },
    },
    images: [coverPhoto("7482435186140007685"), coverPhoto("7482434579647827206")],
    collection: "more",
    category: "mini",
    tags: ["chainsaw man", "denji", "power", "aki", "makima"],
    attributes: attrs("9 cm"),
    skus: characterSkus("seed-chainsaw", 89000, 0, [["Denji"], ["Power"], ["Aki", "7482435186140007685"], ["Makima", "7482434579647827206"]]),
    tiktokVideoIds: ["7482434579647827206", "7482435186140007685"],
    createdAt: "2025-03-15T00:00:00.000Z",
  }),
];
