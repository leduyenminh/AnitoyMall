import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CashIcon, MapIcon, SparkleIcon, TikTokIcon, TruckIcon } from "@/components/icons";
import { ProductCard } from "@/components/product/product-card";
import { TikTokVideo } from "@/components/product/tiktok-video";
import { fmt, getDictionary } from "@/i18n";
import { isLocale, localePath } from "@/i18n/config";
import { collections, productTitle } from "@/lib/catalog";
import { getActiveProducts } from "@/lib/data";
import { formatMoney } from "@/lib/money";
import { site } from "@/lib/site";

export const revalidate = 120;

const collectionArt: Record<string, string> = { frieren: "/art/trio-1.svg", neko: "/art/osakana-1.svg" };

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const href = (path: string) => localePath(lang, path);
  const products = await getActiveProducts();

  const bestSellers = products.slice(0, 8);
  const sets = products.filter((p) => p.category === "set").slice(0, 4);
  const videos = products
    .filter((p) => p.tiktokVideoIds.length)
    .slice(0, 4)
    .map((p) => ({ id: p.tiktokVideoIds[0]!, poster: p.images[0], title: productTitle(p, lang) }));

  return (
    <>
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
                ♥
              </span>
              {fmt(t.home.likes, { n: site.tiktok.likesLabel })} · @{site.tiktok.handle}
            </p>
          </div>
          <div className="hero__art window">
            <div className="window__titlebar" aria-hidden="true">
              <span className="window__title">anitoy_friends.bmp</span>
              <span className="window__controls">
                <span />
                <span />
                <span />
              </span>
            </div>
            <div className="hero__art-frame">
              <Image src="/art/hero.svg" alt="" fill preload loading="eager" unoptimized sizes="(min-width: 900px) 520px, 90vw" />
            </div>
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
            return (
              <Link key={c.slug} href={`${href("/shop")}?collection=${c.slug}`} className="collection-card window" style={{ "--collection": c.accent } as React.CSSProperties}>
                <div className="window__titlebar" aria-hidden="true">
                  <span className="window__title">{c.slug}</span>
                </div>
                <div className="collection-card__art">
                  <Image src={collectionArt[c.slug] ?? "/art/hero.svg"} alt="" fill unoptimized sizes="(min-width: 700px) 50vw, 100vw" />
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
          <h2 className="section__title">{t.home.bestSellers}</h2>
          <Link href={href("/shop")} className="section__link">
            {t.home.viewAll} →
          </Link>
        </div>
        <div className="product-grid">
          {bestSellers.map((p, i) => (
            <ProductCard key={p.id} product={p} lang={lang} t={t} priority={i < 2} />
          ))}
        </div>
      </section>

      {sets.length > 0 && (
        <section className="section section--tint">
          <div className="container">
            <div className="section__head">
              <div>
                <h2 className="section__title">{t.home.sets}</h2>
                <p className="muted">{t.home.setsSubtitle}</p>
              </div>
              <Link href={`${href("/shop")}?category=set`} className="section__link">
                {t.home.viewAll} →
              </Link>
            </div>
            <div className="product-grid">
              {sets.map((p) => (
                <ProductCard key={p.id} product={p} lang={lang} t={t} />
              ))}
            </div>
          </div>
        </section>
      )}

      {videos.length > 0 && (
        <section className="section container">
          <div className="section__head">
            <div>
              <h2 className="section__title">{t.home.tiktokTitle}</h2>
              <p className="muted">{fmt(t.home.tiktokSubtitle, { handle: site.tiktok.handle })}</p>
            </div>
            <a href={site.tiktok.profileUrl} className="btn btn--tiktok btn--sm" target="_blank" rel="noopener">
              <TikTokIcon size={16} /> {t.home.follow}
            </a>
          </div>
          <div className="video-grid">
            {videos.map((v) => (
              <TikTokVideo key={v.id} videoId={v.id} poster={v.poster} title={v.title} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
