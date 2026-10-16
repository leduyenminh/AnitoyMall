import type { TikTokVideo } from "@/lib/types";

// The shop's TikTok videos (@leduyenminh): ids, captions and view counts as shown on TikTok on
// 2026-10-16. Covers live in public/shop/videos (see scripts/import-tiktok-media.mjs).
// Once the TikTok account is connected in /admin, the video sync keeps views and new videos current.

const SNAPSHOT = "2026-10-16T00:00:00.000Z";

type Row = [id: string, views: number, title: string, pinned?: boolean];

const rows: Row[] = [
  ["7549993146407472404", 199400, "Frieren minifigure for healing bà con ơi. Dùng bé để decor góc làm việc thì cực chill", true],
  ["7621226947661548801", 493000, "Season 2 Frieren đã bắt đầu, trang trí góc làm việc bằng nàng Frieren 20cm này nhaaaaa", true],
  ["7492968606561537281", 38200, "My cat is a kawaii girl - Figure neko Kinako", true],
  ["7674565388323081493", 530, "Frieren đã trở lại và lợi hại hơn rồi nha mina"],
  ["7674564950177746184", 532, "Trang trí góc làm việc, học tập bằng Frieren cute 10cm nào mấy bác"],
  ["7674564397632703765", 631, "Mô hình Frieren · Fern · Stark khớp xoay đầu, nhựa PVC decor bàn học"],
  ["7674562947850521876", 481, "Fern cute tròn xoe 10cm"],
  ["7657157899403283720", 1687, "Stark chill – mô hình khớp xoay đầu, nhựa PVC decor bàn học"],
  ["7656326591559044360", 1074, "Stark from Frieren series – mô hình khớp xoay đầu"],
  ["7656322520693411092", 4955, "The new Fern – mô hình khớp xoay đầu, nhựa PVC decor bàn học"],
  ["7656321056503811348", 1417, "Fern cute tròn xoe 10cm"],
  ["7633679526999903495", 557, "Bà con ra đây mà xem Frieren Fern Stark cute quá nè 10cm"],
  ["7633457885283962130", 652, "Chill chill dịp lễ cùng Frieren 10cm cute nha, phần đầu xoay được nha"],
  ["7633031631548189960", 1420, "Ba thầy trò Frieren, Fern và Stark đã có mặt tại Anitoy"],
  ["7632734394762939668", 1017, "Cặp đôi Fern và Stark trong bộ 3 thầy trò Frieren nha"],
  ["7632650329791794439", 508, "Ba thầy trò Frieren, Fern và Stark đã có mặt tại Anitoy"],
  ["7632538479074741511", 722, "Ba thầy trò Frieren, Fern và Stark đã có mặt tại Anitoy"],
  ["7627760395935091989", 4012, "Ba thầy trò Frieren, Fern và Stark đã có mặt tại Anitoy"],
  ["7621236910488440071", 42300, "My cat is a kawaii girl - Osakana neko-chan 20cm đã quay trở lại"],
  ["7621218499368733972", 25400, "My cat is a kawaii girl - Osakana neko-chan 20cm đã quay trở lại"],
  ["7621217028191341845", 22200, "Neko mặc áo trùm decor bàn làm việc bàn học siêu cute siêu nét"],
  ["7620836995979398421", 3264, "Lại là em nó đây, Neko 20cm cầm cá khổng lồ, không nhựa thừa"],
  ["7620485098479127828", 6405, "Neko 20cm cầm cá khổng lồ, trang trí góc học tập nào"],
  ["7619409900178803969", 10700, "Season 2 Frieren đã bắt đầu, trang trí góc làm việc bằng nàng Frieren 20cm ôm hoa"],
  ["7618627305706900757", 128100, "Frieren ôm đóa hoa tưởng nhớ Himmel – figure 20cm chi tiết hoàn thiện"],
  ["7614891907692383495", 1691, "My cat is a kawaii girl - Figure Osakana Neko dáng đứng cầm cá cao 20cm"],
  ["7613067330490322184", 9878, "Frieren 20cm có đế, đứng ôm hoa – Frieren Beyond Journey's End phiên bản mới"],
  ["7611820025145478420", 47600, "Season 2 Frieren đã bắt đầu, trang trí góc làm việc bằng nàng Frieren 20cm này nhaaaaa"],
  ["7611009561905925384", 8491, "Mô hình Frieren pháp sư tiễn táng 20cm có đế – phiên bản mới"],
  ["7597853119460019477", 16200, "Mô hình Frieren pháp sư tiễn táng 20cm có đế – phiên bản mới"],
  ["7594160266502229249", 3258, "Cùng đếm ngược đến season 2 của Frieren thôi bà con"],
  ["7588433330534698248", 2792, "Pháp sư tiễn táng Frieren hoài niệm chữa lành dùng decor góc làm việc"],
  ["7586734408854473985", 3904, "Pháp sư tiễn táng Frieren chữa lành dùng decor góc làm việc"],
  ["7581162734172130580", 7664, "Pháp sư tiễn táng Frieren chill chill dùng decor góc làm việc"],
  ["7571146763508141330", 1190, "Kochou Shinobu cực chiến cùng Nezuko làm nền"],
  ["7571146172530691349", 439, "Em gái quỷ Nezuko Kamado minifigure 12cm"],
  ["7560030663039094037", 1197, "Tanjirou Kamado minifigure 12cm – nhìn vậy chứ chill và chữa lành lắm nhe"],
  ["7557246821714693377", 49600, "Bé neko Osakana vừa chữa lành vừa cực cháy tại Anitoy. Kích thước 12cm"],
  ["7555219159605447953", 7850, "Kinako neko mặc áo khoác tím dáng ngồi, kích thước 10cm"],
  ["7555214243209956628", 58900, "Bé neko Osakana siêu chữa lành tại Anitoy. Kích thước 12cm"],
  ["7555213325857066260", 19400, "Chào đón thành viên mới của neko figure, một phiên bản khác của Osakana"],
  ["7555210852991847700", 2956, "Mô hình cô gái tai mèo Neko Kinako mặc áo trùm tím dáng ngồi 10cm"],
  ["7553301852889074960", 7668, "Mô hình Frieren khớp xoay, nhựa có nhũ vàng – decor bàn học, bàn làm việc"],
  ["7537853071469202709", 3412, "Frieren minifigure chữa lành nghe mà thấm"],
  ["7536273814301183239", 6000, "Frieren minifigure chữa lành cho góc decor của bạn đây"],
  ["7531592805370563847", 1308, "Em gái quỷ Nezuko Kamado minifigure 12cm"],
  ["7531592617755184391", 4457, "Zenitsu – Thanh gươm diệt quỷ, hơi thở của sấm sét"],
  ["7531591983840759047", 1690, "Frieren xoay đầu (11cm) cute cho góc làm việc học tập"],
  ["7528781074755898642", 2216, "Frieren cute với chi tiết mạ vàng, hợp không gian chill & healing"],
  ["7527101479904103696", 103700, "Frieren cực cute cho không gian chill và healing"],
  ["7518794555769048327", 1566, "My cat is a kawaii girl - Osakana Neko Kinako-chan cầm chú cá khổng lồ 20cm"],
  ["7518640842546924808", 4588, "My cat is a kawaii girl - Osakana Neko-chan cầm chú cá khổng lồ 20cm"],
  ["7517823152458665223", 1986, "Frieren chill chill station"],
  ["7515785628425161991", 1692, "Móc khoá acrylic cao cấp Frieren, Fern, Himmel, Stark"],
  ["7515783406832356615", 1672, "Frieren cho mọi nhà đây"],
  ["7513020234454895879", 2089, "So cute Frieren figure, good detail on cloth and rotating head"],
  ["7509523638320696594", 693, "Em gái quỷ Nezuko Kamado minifigure 12cm"],
  ["7507834221172362503", 349, "Inosuke giá hạt dẻ cho mọi nhà"],
  ["7507422443791846663", 2447, "Inosuke minifigure – Thanh gươm diệt quỷ"],
  ["7506330873042586898", 1647, "Shinobu Kochou Trùng Trụ mini 11cm nha mọi người"],
  ["7505300468239715605", 1428, "Mô hình Kimetsu no Yaiba: Tanjirou, Nezuko, Zenitsu, Inosuke, Giyu, Shinobu"],
  ["7499143655727336722", 6124, "Kochou Shinobu – Thanh gươm diệt quỷ"],
  ["7499137968263810325", 3353, "My cat is a kawaii girl - Osakana Neko"],
  ["7495648865081642261", 17300, "Rước bé neko Osakana tại Anitoy nhé"],
  ["7492967986047864085", 1047, "Dây đeo điện thoại Honkai Star Rail: Silver Wolf, Kafka, Dan Heng, Jing Yuan, Yanqing, Blade"],
  ["7489718987454942470", 1494, "Dây đeo điện thoại Honkai Star Rail: Silver Wolf, Kafka, Dan Heng, Jing Yuan, Yanqing, Blade"],
  ["7485802326825913605", 18300, "Frieren keychain 2 mặt luôn chờ bạn sở hữu nè"],
  ["7484071785730772229", 3550, "Robin, Kafka và Silver Wolf standee"],
  ["7482435186140007685", 1866, "3 anh em Denji, Power và Aki cute"],
  ["7482434579647827206", 3191, "Makima cute phô mai que"],
  ["7478866157714296069", 7310, "Genshin Impact keychain acrylic"],
  ["7478384002714373382", 18900, "My cat is a kawaii girl - Figure neko"],
];

export const seedVideos: TikTokVideo[] = rows.map(([id, views, title, pinned]) => ({
  id,
  title,
  views,
  cover: `/shop/videos/${id}.webp`,
  ...(pinned ? { pinned } : {}),
  updatedAt: SNAPSHOT,
}));

/**
 * Square photo cropped from a video cover. Only for items whose TikTok Shop listing photos are not
 * available; listing photos always come first.
 */
export const coverPhoto = (videoId: string) => `/shop/videos/${videoId}-square.webp`;
