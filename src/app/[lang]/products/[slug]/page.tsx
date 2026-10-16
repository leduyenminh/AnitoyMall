import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product/product-card";
import { ProductHero } from "@/components/product/product-hero";
import { TikTokVideo } from "@/components/product/tiktok-video";
import { Breadcrumbs, JsonLd } from "@/components/seo";
import { fmt, getDictionary } from "@/i18n";
import { isLocale, localePath } from "@/i18n/config";
import {
  collectionName,
  priceRange,
  productAttributes,
  productDescription,
  productTitle,
  relatedProducts,
  skuName,
  totalStock,
} from "@/lib/catalog";
import { getActiveProducts, getProductBySlug, getVideoMap } from "@/lib/data";
import { fromMinorUnits, formatMoney } from "@/lib/money";
import { site } from "@/lib/site";
import { formatViews, productVideos, toVideoCard, totalViews } from "@/lib/videos";

export const revalidate = 120;

// Rendered on first request and cached (ISR) rather than at build time, so pages always reflect
// the live catalog in DynamoDB.
export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ lang: string; slug: string }> };

const absolute = (src: string) => (src.startsWith("http") ? src : `${site.url}${src}`);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const product = await getProductBySlug(slug);
  if (!product) return {};
  const title = productTitle(product, lang);
  const description = productDescription(product, lang).split("\n")[0]?.slice(0, 160);
  const { min } = priceRange(product);
  return {
    title,
    description: `${formatMoney(min, lang)} · ${description}`,
    alternates: {
      canonical: localePath(lang, `/products/${slug}`),
      languages: { vi: `/products/${slug}`, en: `/en/products/${slug}` },
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: localePath(lang, `/products/${slug}`),
      images: product.images.filter((i) => !i.endsWith(".svg")).slice(0, 4).map(absolute),
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const t = getDictionary(lang);
  const href = (path: string) => localePath(lang, path);
  const title = productTitle(product, lang);
  const description = productDescription(product, lang);
  const attributes = productAttributes(product, lang);
  const related = relatedProducts(await getActiveProducts(), product);
  const videoMap = await getVideoMap();
  const videos = productVideos(product, videoMap);
  const { min, max } = priceRange(product);
  const url = `${site.url}${href(`/products/${slug}`)}`;

  return (
    <div className="container page pdp">
      <Breadcrumbs
        label={t.common.breadcrumb}
        items={[
          { name: t.nav.home, href: href("/") },
          { name: collectionName(product.collection, lang), href: `${href("/shop")}?collection=${product.collection}` },
          { name: title },
        ]}
      />

      <ProductHero
        product={{
          id: product.id,
          slug: product.slug,
          title,
          collectionLabel: collectionName(product.collection, lang),
          images: product.images,
          tiktokProductId: product.tiktokProductId,
          videos: videos.map(toVideoCard),
          skus: product.skus.map((s) => ({
            id: s.id,
            name: skuName(product, s, lang),
            price: s.price,
            compareAtPrice: s.compareAtPrice,
            stock: s.stock,
            image: s.image,
          })),
        }}
      />

      <div className="pdp-details">
        <section className="card window">
          <div className="window__titlebar" aria-hidden="true">
            <span className="window__title">README.TXT</span>
          </div>
          <div className="card__body prose">
            <h2 className="card__title">{t.product.description}</h2>
            {description.split(/\n{2,}/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </section>
        {attributes.length > 0 && (
          <section className="card window">
            <div className="window__titlebar" aria-hidden="true">
              <span className="window__title">{t.product.details}</span>
            </div>
            <div className="card__body">
              <h2 className="card__title">{t.product.details}</h2>
              <dl className="specs">
                {attributes.map((a) => (
                  <div key={a.name}>
                    <dt>{a.name}</dt>
                    <dd>{a.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        )}
      </div>

      {videos.length > 0 && (
        <section className="section">
          <div className="section__head">
            <div>
              <h2 className="section__title">{t.product.videos}</h2>
              <p className="muted">
                {fmt(t.product.videoViewsTotal, { n: formatViews(totalViews(videos)), count: videos.length })} · {t.product.officialPlayer}
              </p>
            </div>
          </div>
          <div className="video-grid">
            {videos.slice(0, 8).map((video) => (
              <TikTokVideo key={video.id} video={toVideoCard(video)} />
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="section">
          <h2 className="section__title">{t.product.related}</h2>
          <div className="product-grid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} lang={lang} t={t} videos={videoMap} />
            ))}
          </div>
        </section>
      )}

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: title,
          description,
          sku: product.skus[0]?.sellerSku ?? product.id,
          image: product.images.map(absolute),
          brand: { "@type": "Brand", name: site.name },
          category: collectionName(product.collection, lang),
          url,
          ...(product.rating
            ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating.value, reviewCount: product.rating.count } }
            : {}),
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: site.currency,
            lowPrice: fromMinorUnits(min),
            highPrice: fromMinorUnits(max),
            offerCount: product.skus.length,
            availability: totalStock(product) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url,
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: t.nav.home, item: `${site.url}${href("/")}` },
            { "@type": "ListItem", position: 2, name: collectionName(product.collection, lang), item: `${site.url}${href("/shop")}?collection=${product.collection}` },
            { "@type": "ListItem", position: 3, name: title, item: url },
          ],
        }}
      />
    </div>
  );
}
