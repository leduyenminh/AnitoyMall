import Link from "next/link";
import type { Dictionary } from "@/i18n";
import { fmt } from "@/i18n";
import { localePath } from "@/i18n/config";
import {
  collectionName,
  defaultSku,
  isInStock,
  priceRange,
  productTitle,
  skuName,
  totalStock,
} from "@/lib/catalog";
import { percentOff } from "@/lib/money";
import type { Locale, Product, TikTokVideo } from "@/lib/types";
import { productVideos, toVideoCard, totalViews } from "@/lib/videos";
import { ChevronRightIcon } from "../icons";
import { Price } from "./price";
import { ProductImage } from "./product-image";
import { QuickAdd } from "./quick-add";
import { VideoPreviewButton } from "./video-preview";

export const LOW_STOCK = 5;

export function ProductCard({
  product,
  lang,
  t,
  videos,
  priority = false,
}: {
  product: Product;
  lang: Locale;
  t: Dictionary;
  /** All shop videos; the card shows this product's total TikTok views and previews the top one. */
  videos?: Map<string, TikTokVideo>;
  priority?: boolean;
}) {
  const href = localePath(lang, `/products/${product.slug}`);
  const title = productTitle(product, lang);
  const { min, max, compareAt } = priceRange(product);
  const stock = totalStock(product);
  const inStock = isInStock(product);
  const off = percentOff(min, compareAt);
  const purchasable = product.skus.filter((s) => s.stock > 0);
  const single = purchasable.length === 1 && product.skus.length === 1 ? defaultSku(product) : undefined;
  const featuredVideos = videos ? productVideos(product, videos) : [];

  return (
    <article className={`product-card window${inStock ? "" : " is-soldout"}`}>
      <div className="window__titlebar" aria-hidden="true">
        <span className="window__title">{product.slug.slice(0, 22)}.bmp</span>
        <span className="window__controls">
          <span />
          <span />
          <span />
        </span>
      </div>
      <div className="product-card__media-wrap">
        <Link href={href} className="product-card__media" tabIndex={-1} aria-hidden="true">
          <ProductImage
            src={product.images[0]}
            alt=""
            sizes="(min-width: 1100px) 260px, (min-width: 700px) 30vw, 48vw"
            priority={priority}
          />
          <span className="product-card__badges">
            {off !== undefined && <span className="badge badge--sale">-{off}%</span>}
            {!inStock && <span className="badge badge--out">{t.product.outOfStock}</span>}
            {inStock && stock <= LOW_STOCK && <span className="badge badge--low">{fmt(t.product.lowStock, { n: stock })}</span>}
          </span>
        </Link>
        {featuredVideos[0] && (
          <VideoPreviewButton
            video={toVideoCard(featuredVideos[0])}
            totalViews={totalViews(featuredVideos)}
            productTitle={title}
            productHref={href}
          />
        )}
      </div>
      <div className="product-card__body">
        <p className="product-card__meta">{collectionName(product.collection, lang)}</p>
        <h3 className="product-card__title">
          <Link href={href}>{title}</Link>
        </h3>
        <div className="product-card__foot">
          <Price amount={min} compareAt={compareAt} locale={lang} fromLabel={max > min ? t.product.from : undefined} />
          {single ? (
            <QuickAdd
              label={fmt(t.product.quickAdd, { title })}
              line={{
                productId: product.id,
                skuId: single.id,
                quantity: 1,
                price: single.price,
                title,
                skuName: skuName(product, single, lang),
                slug: product.slug,
                image: single.image ?? product.images[0],
                maxQuantity: single.stock,
              }}
            />
          ) : inStock ? (
            <Link href={href} className="icon-btn icon-btn--soft" aria-label={title}>
              <ChevronRightIcon />
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
