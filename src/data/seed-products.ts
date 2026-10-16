import type { Product, ProductAttribute, Sku } from "@/lib/types";
import { coverPhoto } from "./tiktok-videos";

// Starter catalog: Mall of Anitoy's TikTok Shop listings as linked from its TikTok videos, using
// the listing photos the shop uploaded (public/shop/products). Three items appear in videos without
// a linked listing; they use photos cropped from the shop's own video covers instead.
//
// PLACEHOLDER COMMERCE DATA: TikTok's public listing pages are not readable without the Shop API,
// so prices, stock and variant names are illustrative (older lines are shown as sold out).
// Connect TikTok Shop in /admin and run a sync: listings update in place (they share the TikTok
// product id) and the video-only items are archived once the real catalog is in.

const CREATED = "2026-04-01T00:00:00.000Z";

/** A photo from the shop's TikTok Shop listing. */
const listingPhoto = (tiktokProductId: string, n: number) => `/shop/products/${tiktokProductId}-${n}.webp`;
const listingPhotos = (tiktokProductId: string, count: number) =>
  Array.from({ length: count }, (_, i) => listingPhoto(tiktokProductId, i + 1));

type SeedInput = Omit<Product, "status" | "source" | "createdAt" | "updatedAt" | "featured" | "tags"> & {
  featured?: number;
  createdAt?: string;
  tags?: string[];
};

const seed = ({ createdAt = CREATED, featured = 0, tags = [], ...p }: SeedInput): Product => ({
  status: "active",
  source: "seed",
  createdAt,
  updatedAt: createdAt,
  featured,
  tags,
  ...p,
});

const attrs = (height: string | undefined, material: string, extra: ProductAttribute[] = []): ProductAttribute[] => [
  ...(height ? [{ name: "Chiều cao", value: height }] : []),
  { name: "Chất liệu", value: material },
  ...extra,
];
const attrsEn = (height: string | undefined, material: string, extra: ProductAttribute[] = []): ProductAttribute[] => [
  ...(height ? [{ name: "Height", value: height }] : []),
  { name: "Material", value: material },
  ...extra,
];

/** One SKU per variant; `image` points at the photo showing that variant when known. */
const variants = (prefix: string, price: number, stock: number, names: [name: string, image?: string][]): Sku[] =>
  names.map(([name, image], i) => ({
    id: `${prefix}-${i + 1}`,
    name,
    price,
    stock,
    ...(image ? { image } : {}),
  }));

const FRIEREN_LISTING = "1731581424295380108";
const HSR_STRAP_LISTING = "1732037239614048396";
const HSR_STANDEE_LISTING = "1731969014499674252";
const FRIEREN_KEYCHAIN_LISTING = "1731406172224063628";
const CSM_CUTE_LISTING = "1731012705142212748";
const KINAKO_LISTING = "1732681072582362252";
const OSAKANA_STANDING_LISTING = "1731739548394554508";
const GENSHIN_KEYCHAIN_LISTING = "1731012707779119244";
const CSM_PVC_LISTING = "1730183145967224972";

export const seedProducts: Product[] = [
  // ------------------------------------------------------------------ Frieren
  seed({
    id: `tt-${FRIEREN_LISTING}`,
    slug: "mo-hinh-frieren-phap-su-yeu-tinh-nhua-pvc-khop-xoay-decor-ban-hoc",
    title:
      "ANIToy Mô Hình Pháp Sư Yêu Tinh Frieren Pháp sư Fern chiến binh Stark Khớp Xoay Đầu Chất Liệu Nhựa PVC Decor Bàn Học Làm Việc Tính Thẩm Mỹ Cao",
    description:
      "Bộ ba thầy trò Frieren, Fern và Stark phiên bản chibi, đầu xoay được, nhựa PVC chi tiết sắc nét.\n\nDecor góc học tập, bàn làm việc cực chill – chọn nhân vật bạn thích hoặc gom đủ bộ ba.",
    i18n: {
      en: {
        title: "Frieren, Fern & Stark Chibi Figures – Rotating Head, PVC",
        description:
          "Frieren and her apprentices Fern and Stark as chibi figures with rotating heads, finely detailed PVC.\n\nPick your favourite or collect the whole party for your desk.",
        attributes: attrsEn("10–11 cm", "PVC", [{ name: "Rotating head", value: "Yes" }]),
      },
    },
    images: listingPhotos(FRIEREN_LISTING, 9),
    collection: "frieren",
    category: "mini",
    tags: ["frieren", "fern", "stark", "sousou no frieren", "chibi", "decor"],
    attributes: attrs("10–11 cm", "Nhựa PVC", [{ name: "Đầu xoay được", value: "Có" }]),
    skus: variants("seed-frieren", 79000, 0, [
      ["Frieren", listingPhoto(FRIEREN_LISTING, 4)],
      ["Fern", listingPhoto(FRIEREN_LISTING, 8)],
      ["Stark", listingPhoto(FRIEREN_LISTING, 7)],
    ]).map((sku, i) => ({ ...sku, stock: [12, 8, 4][i]! })),
    tiktokProductId: FRIEREN_LISTING,
    tiktokUrl: "https://shop.tiktok.com/vn/pdp/mo-hinh-frieren-phap-su-yeu-tinh-nhua-pvc-khop-xoay-decor-ban-hoc/1731581424295380108",
    tiktokVideoIds: [
      "7549993146407472404",
      "7527101479904103696",
      "7581162734172130580",
      "7553301852889074960",
      "7536273814301183239",
      "7656322520693411092",
      "7627760395935091989",
      "7586734408854473985",
      "7537853071469202709",
      "7594160266502229249",
      "7588433330534698248",
      "7528781074755898642",
      "7513020234454895879",
      "7517823152458665223",
      "7657157899403283720",
      "7531591983840759047",
      "7515783406832356615",
      "7656321056503811348",
      "7633031631548189960",
      "7656326591559044360",
      "7632734394762939668",
      "7632538479074741511",
      "7633457885283962130",
      "7674564397632703765",
      "7633679526999903495",
      "7674564950177746184",
      "7674565388323081493",
      "7632650329791794439",
      "7674562947850521876",
    ],
    featured: 100,
    createdAt: "2025-07-01T00:00:00.000Z",
  }),
  seed({
    id: "seed-frieren-20cm",
    slug: "frieren-flower-figure-20cm",
    title: "Mô hình Frieren pháp sư tiễn táng 20cm đứng ôm hoa – có đế, no box",
    description:
      "Frieren ôm đóa hoa tưởng nhớ Himmel – khoảnh khắc đáng nhớ nhất của series. Cao 20cm, chi tiết hoàn thiện, có đế trưng bày (no box).\n\nSeason 2 đã bắt đầu – trang trí góc làm việc bằng nàng Frieren ngay hôm nay.",
    i18n: {
      en: {
        title: "Frieren 20cm Figure Holding Flowers – with Base (no box)",
        description:
          "Frieren holding flowers in memory of Himmel – the series' most moving moment. 20cm tall, finely finished, with display base (no box).",
        attributes: attrsEn("20 cm", "PVC", [{ name: "Display base", value: "Included (no box)" }]),
      },
    },
    // Not linked to a TikTok Shop listing in the videos: photos cropped from the shop's covers.
    images: [coverPhoto("7619409900178803969"), coverPhoto("7597853119460019477"), coverPhoto("7618627305706900757"), coverPhoto("7613067330490322184")],
    collection: "frieren",
    category: "figure",
    tags: ["frieren", "himmel", "figure", "20cm", "gift"],
    attributes: attrs("20 cm", "Nhựa PVC", [{ name: "Đế trưng bày", value: "Có (no box)" }]),
    skus: [{ id: "seed-frieren-20cm-1", name: "Tiêu chuẩn", price: 329000, stock: 7 }],
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
    id: `tt-${FRIEREN_KEYCHAIN_LISTING}`,
    slug: "moc-khoa-acrylic-cao-cap-trang-tri-nhan-vat-frieren-fern",
    title: "Móc khoá trang trí cao cấp acrylic Anitoy Frieren Beyond The Journey End Frieren Fern Himmel Shark",
    description: "Móc khoá acrylic cao cấp in hình nhân vật Frieren Beyond Journey's End: Frieren, Fern, Himmel, Stark…",
    i18n: {
      en: {
        title: "Frieren: Beyond Journey's End Premium Acrylic Keychains",
        description: "Premium acrylic keychains of Frieren, Fern, Himmel, Stark and friends.",
        attributes: attrsEn(undefined, "Acrylic"),
      },
    },
    images: listingPhotos(FRIEREN_KEYCHAIN_LISTING, 8),
    collection: "frieren",
    category: "accessory",
    tags: ["keychain", "móc khoá", "acrylic", "frieren", "fern", "himmel", "stark"],
    attributes: attrs(undefined, "Acrylic"),
    skus: variants("seed-frieren-keychain", 35000, 0, [["Mẫu 1"], ["Mẫu 2"], ["Mẫu 3"], ["Mẫu 4"], ["Mẫu 5"], ["Mẫu 6"]]),
    tiktokProductId: FRIEREN_KEYCHAIN_LISTING,
    tiktokUrl: "https://shop.tiktok.com/vn/pdp/moc-khoa-acrylic-cao-cap-trang-tri-nhan-vat-frieren-fern/1731406172224063628",
    tiktokVideoIds: ["7485802326825913605", "7515785628425161991"],
    createdAt: "2025-03-20T00:00:00.000Z",
  }),

  // ------------------------------------------------------------------ Neko Kawaii
  seed({
    id: `tt-${OSAKANA_STANDING_LISTING}`,
    slug: "mo-hinh-anitoy-neko-kemono-kinako-20cm-pvc-200g-trang-tri-do-choi",
    title: "Mô Hình ANITOY Osakana Neko dáng đứng cầm cá - Kinako kawaii PVCK 200g 20cm- Decor, Đồ Chơi trang trí góc làm việc học tập",
    description:
      "My cat is a kawaii girl – Osakana Neko dáng đứng ôm con cá khổng lồ, cao 20cm, nặng 200g, không nhựa thừa, màu sắc tươi tắn.\n\nĐiểm nhấn siêu cute cho góc học tập, làm việc.",
    i18n: {
      en: {
        title: "Osakana Neko Standing Figure with Giant Fish – 20cm PVC",
        description: "My Cat Is a Kawaii Girl – a 20cm (200g) standing Osakana Neko hugging a giant fish, cleanly finished in bright colours.",
        attributes: attrsEn("20 cm", "PVC", [{ name: "Weight", value: "200 g" }]),
      },
    },
    images: listingPhotos(OSAKANA_STANDING_LISTING, 6),
    collection: "neko",
    category: "figure",
    tags: ["neko", "osakana", "kinako", "cat girl", "20cm"],
    attributes: attrs("20 cm", "Nhựa PVC", [{ name: "Khối lượng", value: "200 g" }]),
    skus: [{ id: "seed-osakana-standing-1", name: "Tiêu chuẩn", price: 259000, stock: 11 }],
    tiktokProductId: OSAKANA_STANDING_LISTING,
    tiktokUrl: "https://shop.tiktok.com/vn/pdp/mo-hinh-anitoy-neko-kemono-kinako-20cm-pvc-200g-trang-tri-do-choi/1731739548394554508",
    tiktokVideoIds: ["7620485098479127828", "7518640842546924808", "7620836995979398421", "7614891907692383495", "7518794555769048327"],
    featured: 92,
  }),
  seed({
    id: "seed-osakana-sitting",
    slug: "osakana-neko-chan-sitting-figure",
    title: "Mô hình Osakana neko-chan dáng ngồi – My cat is a kawaii girl",
    description:
      "My cat is a kawaii girl – bé neko Osakana dáng ngồi vừa chữa lành vừa cực cháy, đã quay trở lại tại Anitoy.\n\nTrang trí góc làm việc, học tập rất chill.",
    i18n: {
      en: {
        title: "Osakana Neko-chan Sitting Figure – My Cat Is a Kawaii Girl",
        description: "My Cat Is a Kawaii Girl – the sitting Osakana neko-chan is back at Anitoy. A soothing, stylish desk companion.",
        attributes: attrsEn(undefined, "PVC"),
      },
    },
    // Not linked to a TikTok Shop listing in the videos: photos cropped from the shop's covers.
    images: [coverPhoto("7557246821714693377"), coverPhoto("7621236910488440071"), coverPhoto("7492968606561537281"), coverPhoto("7555214243209956628")],
    collection: "neko",
    category: "mini",
    tags: ["neko", "osakana", "kinako", "cat girl"],
    attributes: attrs(undefined, "Nhựa PVC"),
    skus: [{ id: "seed-osakana-sitting-1", name: "Tiêu chuẩn", price: 199000, stock: 9 }],
    tiktokVideoIds: [
      "7555214243209956628",
      "7557246821714693377",
      "7621236910488440071",
      "7492968606561537281",
      "7621218499368733972",
      "7478384002714373382",
      "7495648865081642261",
      "7499137968263810325",
    ],
    featured: 88,
  }),
  seed({
    id: `tt-${KINAKO_LISTING}`,
    slug: "mo-hinh-anitoys-neko-kinako-10cm-do-choi-decor-kawaii",
    title: "ANITOY Mô Hình Neko Kinako Mặc Áo Trùm Tím Dáng Ngồi Kích Thước 10cm Chất Liệu Nhựa Decor Đồ Chơi Kawaii",
    description:
      "Cô gái tai mèo Kinako mặc áo trùm tím dáng ngồi, cao 10cm – nhỏ hơn đàn chị xíu nhưng siêu cute, siêu nét.\n\nPhù hợp cho góc decor chill.",
    i18n: {
      en: {
        title: "Kinako Neko in Purple Hooded Coat, Sitting – 10cm",
        description: "Cat-eared Kinako sitting in a purple hooded coat, 10cm tall – small, crisp and super cute.",
        attributes: attrsEn("10 cm", "PVC"),
      },
    },
    images: listingPhotos(KINAKO_LISTING, 7),
    collection: "neko",
    category: "mini",
    tags: ["neko", "kinako", "hoodie", "coat", "cat girl"],
    attributes: attrs("10 cm", "Nhựa"),
    skus: [{ id: "seed-kinako-coat-1", name: "Tiêu chuẩn", price: 129000, stock: 6 }],
    tiktokProductId: KINAKO_LISTING,
    tiktokUrl: "https://shop.tiktok.com/vn/pdp/mo-hinh-anitoys-neko-kinako-10cm-do-choi-decor-kawaii/1732681072582362252",
    tiktokVideoIds: ["7621217028191341845", "7555213325857066260", "7555219159605447953", "7555210852991847700"],
    featured: 75,
  }),

  // ------------------------------------------------------------------ Kimetsu no Yaiba
  seed({
    id: "seed-kimetsu",
    slug: "kimetsu-no-yaiba-figure",
    title: "Mô hình nhân vật Thanh gươm diệt quỷ Kimetsu no Yaiba – Tanjirou, Nezuko, Zenitsu, Inosuke, Giyu, Shinobu",
    description: "Mô hình nhân vật Thanh gươm diệt quỷ (Demon Slayer), nhiều nhân vật để lựa chọn.",
    i18n: {
      en: {
        title: "Demon Slayer (Kimetsu no Yaiba) Character Figures",
        description: "Demon Slayer character figures – Tanjirou, Nezuko, Zenitsu, Inosuke, Giyu and Shinobu.",
        attributes: attrsEn("12–15 cm", "PVC"),
      },
    },
    // Not linked to a TikTok Shop listing in the videos: photos cropped from the shop's covers.
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
    attributes: attrs("12–15 cm", "Nhựa PVC"),
    skus: variants("seed-kimetsu", 99000, 0, [
      ["Tanjirou", coverPhoto("7560030663039094037")],
      ["Nezuko", coverPhoto("7531592805370563847")],
      ["Zenitsu", coverPhoto("7531592617755184391")],
      ["Inosuke", coverPhoto("7507422443791846663")],
      ["Giyu", coverPhoto("7505300468239715605")],
      ["Shinobu", coverPhoto("7499143655727336722")],
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
    id: `tt-${CSM_PVC_LISTING}`,
    slug: "mo-hinh-anime-chainsaw-man-denji-aki-makima-9cm-pvc-do-choi",
    title: "Anitoy Mô hình Quỷ cưa Chainsaw Man Denji Aki Makima Power Pochita Chainsaw Man PVC 9cm - Đồ Chơi",
    description: "Mô hình Chainsaw Man PVC cao 9cm: Denji, Aki, Makima, Power, Pochita và Chainsaw Man.",
    i18n: {
      en: {
        title: "Chainsaw Man PVC Figures 9cm – Denji, Aki, Makima, Power, Pochita",
        description: "9cm Chainsaw Man PVC figures: Denji, Aki, Makima, Power, Pochita and Chainsaw Man.",
        attributes: attrsEn("9 cm", "PVC"),
      },
    },
    images: listingPhotos(CSM_PVC_LISTING, 8),
    collection: "more",
    category: "mini",
    tags: ["chainsaw man", "denji", "aki", "makima", "power", "pochita"],
    attributes: attrs("9 cm", "Nhựa PVC"),
    skus: variants("seed-csm-pvc", 89000, 0, [["Denji"], ["Aki"], ["Makima", listingPhoto(CSM_PVC_LISTING, 3)], ["Power", listingPhoto(CSM_PVC_LISTING, 6)], ["Pochita"], ["Chainsaw Man"]]),
    tiktokProductId: CSM_PVC_LISTING,
    tiktokUrl: "https://shop.tiktok.com/vn/pdp/mo-hinh-anime-chainsaw-man-denji-aki-makima-9cm-pvc-do-choi/1730183145967224972",
    tiktokVideoIds: ["7482434579647827206"],
    createdAt: "2025-03-01T00:00:00.000Z",
  }),
  seed({
    id: `tt-${CSM_CUTE_LISTING}`,
    slug: "mo-hinh-mini-nhan-vat-denji-power-chat-lieu-nhua-pvc",
    title: "Mô hình mini nhân vật Quỷ cưa Chainsaw Man Denji, Power demon hunter dễ thương cute Anitoy",
    description: "Mô hình mini Chainsaw Man siêu dễ thương: Denji, Power, Aki và các thợ săn quỷ.",
    i18n: {
      en: {
        title: "Chainsaw Man Cute Mini Figures – Denji, Power & Devil Hunters",
        description: "Super cute Chainsaw Man minis: Denji, Power, Aki and the devil hunters.",
        attributes: attrsEn(undefined, "PVC"),
      },
    },
    images: listingPhotos(CSM_CUTE_LISTING, 6),
    collection: "more",
    category: "mini",
    tags: ["chainsaw man", "denji", "power", "aki", "mini"],
    attributes: attrs(undefined, "Nhựa PVC"),
    skus: variants("seed-csm-cute", 59000, 0, [["Mẫu 1"], ["Mẫu 2"], ["Mẫu 3"], ["Mẫu 4"], ["Mẫu 5"]]),
    tiktokProductId: CSM_CUTE_LISTING,
    tiktokUrl: "https://shop.tiktok.com/vn/pdp/mo-hinh-mini-nhan-vat-denji-power-chat-lieu-nhua-pvc/1731012705142212748",
    tiktokVideoIds: ["7482435186140007685"],
    createdAt: "2025-03-01T00:00:00.000Z",
  }),
  seed({
    id: `tt-${HSR_STANDEE_LISTING}`,
    slug: "standee-acrylic-hsr-honkai-star-rail-anitoy-bang-ten-nhan-vat-kich-thuoc-10cm",
    title: "ANITOY Standee cỡ lớn 18cm Acrylic Mica nhân vật HSR Honkai Star Rail có bảng tên nhân vật",
    description: "Standee acrylic mica cỡ lớn 18cm nhân vật Honkai Star Rail, có bảng tên nhân vật: Robin, Kafka, Silver Wolf.",
    i18n: {
      en: {
        title: "Honkai: Star Rail Large Acrylic Standee 18cm with Name Plate",
        description: "Large 18cm acrylic standees of Honkai: Star Rail characters with name plates: Robin, Kafka, Silver Wolf.",
        attributes: attrsEn("18 cm", "Acrylic"),
      },
    },
    images: listingPhotos(HSR_STANDEE_LISTING, 6),
    collection: "more",
    category: "accessory",
    tags: ["honkai star rail", "hsr", "standee", "robin", "kafka", "silver wolf"],
    attributes: attrs("18 cm", "Acrylic mica"),
    skus: variants("seed-hsr-standee", 59000, 0, [["Robin", listingPhoto(HSR_STANDEE_LISTING, 3)], ["Kafka", listingPhoto(HSR_STANDEE_LISTING, 2)], ["Silver Wolf"]]),
    tiktokProductId: HSR_STANDEE_LISTING,
    tiktokUrl: "https://shop.tiktok.com/vn/pdp/standee-acrylic-hsr-honkai-star-rail-anitoy-bang-ten-nhan-vat-kich-thuoc-10cm/1731969014499674252",
    tiktokVideoIds: ["7484071785730772229"],
    createdAt: "2025-03-20T00:00:00.000Z",
  }),
  seed({
    id: `tt-${HSR_STRAP_LISTING}`,
    slug: "day-deo-dien-thoai-honkai-star-rail-nhan-vat-acrylic-chac-chan",
    title:
      "Honkai Star Rail Dây đeo điện thoại di động nhân vật Silver Wolf, Kafka, Danheng, Jing Yuan, Yanqing, Blade dùng để trang trí điện thoại",
    description: "Dây đeo điện thoại acrylic nhân vật Honkai Star Rail: Silver Wolf, Kafka, Dan Heng, Jing Yuan, Yanqing, Blade.",
    i18n: {
      en: {
        title: "Honkai: Star Rail Phone Straps – Silver Wolf, Kafka, Dan Heng, Jing Yuan, Yanqing, Blade",
        description: "Acrylic phone straps featuring Honkai: Star Rail characters.",
        attributes: attrsEn(undefined, "Acrylic"),
      },
    },
    images: listingPhotos(HSR_STRAP_LISTING, 7),
    collection: "more",
    category: "accessory",
    tags: ["honkai star rail", "hsr", "phone strap", "dây đeo"],
    attributes: attrs(undefined, "Acrylic"),
    skus: variants("seed-hsr-strap", 39000, 0, [["Silver Wolf"], ["Kafka"], ["Dan Heng"], ["Jing Yuan"], ["Yanqing"], ["Blade"]]),
    tiktokProductId: HSR_STRAP_LISTING,
    tiktokUrl: "https://shop.tiktok.com/vn/pdp/day-deo-dien-thoai-honkai-star-rail-nhan-vat-acrylic-chac-chan/1732037239614048396",
    tiktokVideoIds: ["7489718987454942470", "7492967986047864085"],
    createdAt: "2025-03-25T00:00:00.000Z",
  }),
  seed({
    id: `tt-${GENSHIN_KEYCHAIN_LISTING}`,
    slug: "moc-khoa-genshin-impact-anitoy-yae-miko-zhongli-chat-lieu-acrylic-3-5mm",
    title:
      "ANITOY Móc khóa nhân vật Genshin Impact đa dạng nhân vật Yae Miko Zhongli Diluc Klee Venti Xiao Ganyu Keqing Kazuha Tartaglia chất liệu acrylic Anitoy Móc Khoá",
    description: "Móc khoá acrylic dày 3.5mm nhân vật Genshin Impact: Yae Miko, Zhongli, Diluc, Klee, Venti, Xiao, Ganyu, Keqing, Kazuha, Tartaglia…",
    i18n: {
      en: {
        title: "Genshin Impact Acrylic Keychains – Yae Miko, Zhongli, Diluc, Klee, Venti and more",
        description: "3.5mm acrylic keychains of Genshin Impact characters.",
        attributes: attrsEn(undefined, "Acrylic 3.5 mm"),
      },
    },
    images: listingPhotos(GENSHIN_KEYCHAIN_LISTING, 8),
    collection: "more",
    category: "accessory",
    tags: ["genshin impact", "keychain", "móc khoá", "acrylic"],
    attributes: attrs(undefined, "Acrylic 3.5 mm"),
    skus: variants("seed-genshin-keychain", 35000, 0, [
      ["Yae Miko"],
      ["Zhongli"],
      ["Diluc"],
      ["Klee"],
      ["Venti"],
      ["Xiao"],
      ["Ganyu"],
      ["Keqing"],
      ["Kazuha"],
      ["Tartaglia"],
      ["Mẫu khác"],
    ]),
    tiktokProductId: GENSHIN_KEYCHAIN_LISTING,
    tiktokUrl: "https://shop.tiktok.com/vn/pdp/moc-khoa-genshin-impact-anitoy-yae-miko-zhongli-chat-lieu-acrylic-3-5mm/1731012707779119244",
    tiktokVideoIds: ["7478866157714296069"],
    createdAt: "2025-03-10T00:00:00.000Z",
  }),
];
