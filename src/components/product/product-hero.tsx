"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { fmt } from "@/i18n";
import { formatMoney } from "@/lib/money";
import { site, tiktokProductUrl } from "@/lib/site";
import { formatViews, type VideoCard } from "@/lib/videos";
import { trackPixel } from "../analytics/pixel";
import { useCart } from "../cart/cart-context";
import { QuantityStepper } from "../cart/cart-line-item";
import { useI18n } from "../i18n";
import { CashIcon, CheckIcon, MapIcon, PlayIcon, TikTokIcon, TruckIcon } from "../icons";
import { Price } from "./price";
import { ProductImage } from "./product-image";
import { TikTokPlayer } from "./tiktok-video";

const LOW_STOCK = 5;

export interface HeroSku {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  image?: string;
}

export interface HeroProduct {
  id: string;
  slug: string;
  title: string;
  collectionLabel: string;
  images: string[];
  skus: HeroSku[];
  tiktokProductId?: string;
  tiktokUrl?: string;
  /** Product videos, most viewed first. Shown in the gallery next to the photos. */
  videos: VideoCard[];
}

type Media = { kind: "image"; src: string } | { kind: "video"; video: VideoCard };

const noSubscription = () => () => {};

/**
 * `?sku=` from a shopping feed or shared link. Read only in the browser (null while rendering on
 * the server and hydrating), so the page itself stays cacheable.
 */
function useRequestedSkuId(): string | null {
  return useSyncExternalStore(
    noSubscription,
    () => new URLSearchParams(window.location.search).get("sku"),
    () => null,
  );
}

/** Gallery and buy box: everything on the product page that reacts to the shopper. */
export function ProductHero({ product }: { product: HeroProduct }) {
  const { t, lang, href } = useI18n();
  const { add } = useCart();
  const router = useRouter();
  const fallback = product.skus.find((s) => s.stock > 0) ?? product.skus[0];
  const requestedId = useRequestedSkuId();
  const requested = product.skus.find((s) => s.id === requestedId);
  const initial = requested ?? fallback;
  // The shopper's own picks; until then the page shows `initial`.
  const [skuId, setSkuId] = useState<string>();
  const [quantity, setQuantity] = useState(1);
  const [pickedMedia, setMediaIndex] = useState<number>();
  const [added, setAdded] = useState(false);

  const sku = product.skus.find((s) => s.id === skuId) ?? initial;
  const images = product.images.length ? product.images : sku?.image ? [sku.image] : [];
  const media: Media[] = [
    ...images.map((src) => ({ kind: "image" as const, src })),
    ...product.videos.map((video) => ({ kind: "video" as const, video })),
  ];
  const mediaIndex = pickedMedia ?? (requested?.image ? Math.max(0, images.indexOf(requested.image)) : 0);
  const shown = media[mediaIndex] ?? media[0];

  useEffect(() => {
    trackPixel("ViewContent", {
      contents: [{ content_id: product.id, content_name: product.title, price: fallback?.price }],
      value: fallback?.price,
    });
  }, [product.id, product.title, fallback?.price]);

  if (!sku) return null;
  const soldOut = sku.stock <= 0;

  function selectSku(id: string) {
    setSkuId(id);
    setQuantity(1);
    const next = product.skus.find((s) => s.id === id);
    const index = next?.image ? images.indexOf(next.image) : -1;
    if (index >= 0) setMediaIndex(index);
  }

  function addToCart(open: boolean) {
    add(
      {
        productId: product.id,
        skuId: sku!.id,
        quantity,
        price: sku!.price,
        title: product.title,
        skuName: sku!.name,
        slug: product.slug,
        image: sku!.image ?? images[0],
        maxQuantity: sku!.stock,
      },
      { open },
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  const buttons = (
    <>
      <button type="button" className="btn btn--primary btn--lg" disabled={soldOut} onClick={() => addToCart(true)}>
        {soldOut ? t.product.outOfStock : added ? (
          <>
            <CheckIcon size={18} /> {t.product.added}
          </>
        ) : (
          t.product.addToCart
        )}
      </button>
      <button
        type="button"
        className="btn btn--secondary btn--lg"
        disabled={soldOut}
        onClick={() => {
          addToCart(false);
          router.push(href("/checkout"));
        }}
      >
        {t.product.buyNow}
      </button>
    </>
  );

  return (
    <div className="pdp-hero">
      <div className="pdp-gallery">
        <div className="pdp-gallery__main window">
          <div className="window__titlebar" aria-hidden="true">
            <span className="window__title">{product.slug}.bmp</span>
          </div>
          <div className={`pdp-gallery__frame${shown?.kind === "video" ? " is-video" : ""}`}>
            {shown?.kind === "video" ? (
              // Selected by the shopper, so it starts playing in TikTok's own player.
              <TikTokPlayer key={shown.video.id} videoId={shown.video.id} title={shown.video.title} />
            ) : (
              <ProductImage src={shown?.src} alt={product.title} sizes="(min-width: 900px) 520px, 100vw" priority />
            )}
          </div>
        </div>
        {media.length > 1 && (
          <div className="pdp-gallery__thumbs" role="group" aria-label={t.product.gallery}>
            {media.map((item, i) => (
              <button
                key={item.kind === "image" ? item.src : item.video.id}
                type="button"
                className={`pdp-gallery__thumb${i === mediaIndex ? " is-active" : ""}${item.kind === "video" ? " is-video" : ""}`}
                onClick={() => setMediaIndex(i)}
                aria-label={
                  item.kind === "image"
                    ? fmt(t.product.showImage, { n: i + 1 })
                    : `${t.product.playVideo}: ${fmt(t.product.views, { n: formatViews(item.video.views) })}`
                }
                aria-pressed={i === mediaIndex}
              >
                <ProductImage src={item.kind === "image" ? item.src : item.video.cover} alt="" sizes="80px" />
                {item.kind === "video" && (
                  <span className="pdp-gallery__views">
                    <PlayIcon size={10} /> {formatViews(item.video.views)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pdp-buy">
        <p className="eyebrow">{product.collectionLabel}</p>
        <h1 className="pdp-buy__title">{product.title}</h1>
        <Price amount={sku.price} compareAt={sku.compareAtPrice} locale={lang} size="lg" />
        <p className={`stock ${soldOut ? "stock--out" : sku.stock <= LOW_STOCK ? "stock--low" : "stock--in"}`}>
          <span className="stock__dot" aria-hidden="true" />
          {soldOut ? t.product.outOfStock : sku.stock <= LOW_STOCK ? fmt(t.product.lowStock, { n: sku.stock }) : t.product.inStock}
        </p>

        {product.skus.length > 1 && (
          <fieldset className="options">
            <legend className="options__legend">
              {t.product.variant}: <strong>{sku.name}</strong>
            </legend>
            <div className="options__list">
              {product.skus.map((s) => (
                <label key={s.id} className={`option${s.stock <= 0 ? " is-soldout" : ""}`}>
                  {/* Sold-out variants stay selectable so shoppers can still see them. */}
                  <input type="radio" name="sku" value={s.id} checked={s.id === sku.id} onChange={() => selectSku(s.id)} />
                  <span>{s.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {!soldOut && (
          <div className="pdp-buy__qty">
            <span className="options__legend">{t.product.quantity}</span>
            <QuantityStepper value={quantity} max={sku.stock} label={t.product.quantity} onChange={setQuantity} />
          </div>
        )}

        <div className="pdp-buy__actions">{buttons}</div>
        {soldOut && <p className="alert alert--warning small">{t.product.soldOutHint}</p>}

        <a className="btn btn--tiktok btn--block" href={tiktokProductUrl(product.tiktokProductId, product.tiktokUrl)} target="_blank" rel="noopener">
          <TikTokIcon size={18} /> {t.product.buyOnTikTok}
          <span className="btn__hint">{t.product.buyOnTikTokHint}</span>
        </a>

        <ul className="perks">
          <li>
            <TruckIcon size={18} /> {fmt(t.product.freeShip, { amount: formatMoney(site.shipping.freeThreshold, lang) })}
          </li>
          <li>
            <CashIcon size={18} /> {t.product.cod}
          </li>
          <li>
            <MapIcon size={18} /> {fmt(t.product.delivery, { days: site.shipping.etaDays })}
          </li>
        </ul>
      </div>

      {/* Mobile: keep the primary action within thumb reach. */}
      <div className="sticky-buy" aria-hidden={soldOut}>
        <Price amount={sku.price} compareAt={sku.compareAtPrice} locale={lang} />
        <button type="button" className="btn btn--primary" disabled={soldOut} onClick={() => addToCart(true)} tabIndex={-1}>
          {soldOut ? t.product.outOfStock : t.product.addToCart}
        </button>
      </div>
    </div>
  );
}
