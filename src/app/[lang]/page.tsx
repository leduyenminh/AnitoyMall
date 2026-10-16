import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CashIcon, MapIcon, SparkleIcon, TikTokIcon, TruckIcon } from "@/components/icons";
import { ProductCard } from "@/components/product/product-card";
import { TikTokVideo } from "@/components/product/tiktok-video";
import { CampaignBanner } from "@/components/promo/campaign-banner";
import { fmt, getDictionary } from "@/i18n";
import { isLocale, localePath } from "@/i18n/config";
import { collectionName, collections, productTitle } from "@/lib/catalog";
import { getActiveProducts, getPromotions, getVideoMap } from "@/lib/data";
import { formatMoney } from "@/lib/money";
import { livePromotions } from "@/lib/promotions";
import { site } from "@/lib/site";
import { formatViews, productVideos, toVideoCard, totalViews } from "@/lib/videos";

export const revalidate = 120;

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const href = (path: string) => localePath(lang, path);
  const [products, videoMap, promotions] = await Promise.all([getActiveProducts(), getVideoMap(), getPromotions()]);
  const { campaigns, vouchers } = livePromotions(promotions);

  const allVideos = [...videoMap.values()];
  const viewsOf = (p: (typeof products)[number]) => totalViews(productVideos(p, videoMap));
  // Real popularity: the products whose TikTok videos were watched the most (sold out included).
  const favourites = [...products].sort((a, b) => viewsOf(b) - viewsOf(a)).slice(0, 8);
  // Hero: the shop's own listing photos of its three most-watched items.
  const showcase = favourites.filter((p) => p.tiktokProductId).slice(0, 3);
  // Videos supplement the photos: newest first (TikTok ids grow over time).
  const latestVideos = [...allVideos].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 8);

  return (
    <>
      <CampaignBanner campaigns={campaigns} vouchers={vouchers} lang={lang} t={t} />

      <section className="hero">
        <div className="container hero__inner">
          <div className="hero__copy">
            <p className="eyebrow">
              <SparkleIcon size={16} /> {t.home.eyebrow}
            </p>
            <h1 className="hero__title">{t.home.title}</h1>
            <p className="hero__subtitle">{t.home.subtitle}</p>
            <div className="hero__actions">
              <Link href={href("/shop")} className="btn btn--primary btn--lg">
                {t.home.shopNow}
              </Link>
              <a href={site.tiktok.profileUrl} className="btn btn--tiktok btn--lg" target="_blank" rel="noopener">
                <TikTokIcon size={18} /> {t.home.watchOnTikTok}
              </a>
            </div>
            <p className="hero__proof">
              <span className="hero__hearts" aria-hidden="true">
                ▶
              </span>
              {fmt(t.home.views, { n: formatViews(totalViews(allVideos)) })} · {fmt(t.home.likes, { n: site.tiktok.likesLabel })}
            </p>
          </div>
          <div className="hero__products">
            {showcase.map((p, i) => (
              <Link key={p.id} href={href(`/products/${p.slug}`)} className="hero-product window">
                <span className="hero-product__media">
                  <Image
                    src={p.images[0]!}
                    alt={productTitle(p, lang)}
                    fill
                    sizes="(min-width: 900px) 240px, 33vw"
                    preload={i === 1}
                    loading={i === 1 ? "eager" : "lazy"}
                  />
                </span>
                <span className="hero-product__label">{collectionName(p.collection, lang)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="perks-strip" aria-label="Perks">
        <ul className="container perks-strip__list">
          <li>
            <TruckIcon /> {fmt(t.home.perks.freeShip, { amount: formatMoney(site.shipping.freeThreshold, lang) })}
          </li>
          <li>
            <CashIcon /> {t.home.perks.cod}
          </li>
          <li>
            <MapIcon /> {t.home.perks.nationwide}
          </li>
          <li>
            <TikTokIcon /> {t.home.perks.tiktok}
          </li>
        </ul>
      </section>

      <section className="section container">
        <div className="section__head">
          <h2 className="section__title">{t.home.collections}</h2>
        </div>
        <div className="collection-grid">
          {collections.map((c) => {
            const count = products.filter((p) => p.collection === c.slug).length;
            if (!count) return null;
            return (
              <Link
                key={c.slug}
                href={`${href("/shop")}?collection=${c.slug}`}
                className="collection-card window"
                style={{ "--collection": c.accent } as React.CSSProperties}
              >
                <div className="window__titlebar" aria-hidden="true">
                  <span className="window__title">{c.slug}</span>
                </div>
                <div className="collection-card__art">
                  <Image src={c.image} alt="" fill sizes="(min-width: 700px) 200px, 140px" />
                </div>
                <div className="collection-card__body">
                  <h3 className="collection-card__title">{c.name[lang]}</h3>
                  <p className="muted">{fmt(t.home.productsCount, { n: count })}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section container">
        <div className="section__head">
          <div>
            <h2 className="section__title">{t.home.bestSellers}</h2>
            <p className="muted">{t.home.bestSellersHint}</p>
          </div>
          <Link href={`${href("/shop")}?sort=views`} className="section__link">
            {t.home.viewAll} →
          </Link>
        </div>
        <div className="product-grid">
          {favourites.map((p, i) => (
            <ProductCard key={p.id} product={p} lang={lang} t={t} videos={videoMap} priority={i < 2} />
          ))}
        </div>
      </section>

      {latestVideos.length > 0 && (
        <section className="section section--tint">
          <div className="container">
            <div className="section__head">
              <div>
                <h2 className="section__title">{t.home.tiktokTitle}</h2>
                <p className="muted">
                  {fmt(t.home.tiktokSubtitle, { handle: site.tiktok.handle })} · {t.product.officialPlayer}
                </p>
              </div>
              <a href={site.tiktok.profileUrl} className="btn btn--tiktok btn--sm" target="_blank" rel="noopener">
                <TikTokIcon size={16} /> {t.home.follow}
              </a>
            </div>
            <div className="video-grid">
              {latestVideos.map((video) => (
                <TikTokVideo key={video.id} video={toVideoCard(video)} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
