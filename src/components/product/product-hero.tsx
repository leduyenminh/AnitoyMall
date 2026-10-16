"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fmt } from "@/i18n";
import { formatMoney } from "@/lib/money";
import { site, tiktokProductUrl } from "@/lib/site";
import { trackPixel } from "../analytics/pixel";
import { useCart } from "../cart/cart-context";
import { QuantityStepper } from "../cart/cart-line-item";
import { useI18n } from "../i18n";
import { CashIcon, CheckIcon, MapIcon, TikTokIcon, TruckIcon } from "../icons";
import { Price } from "./price";
import { ProductImage } from "./product-image";

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
}

/** Gallery and buy box: everything on the product page that reacts to the shopper. */
export function ProductHero({ product }: { product: HeroProduct }) {
  const { t, lang, href } = useI18n();
  const { add } = useCart();
  const router = useRouter();
  const initial = product.skus.find((s) => s.stock > 0) ?? product.skus[0];
  const [skuId, setSkuId] = useState(initial?.id);
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [added, setAdded] = useState(false);

  const sku = product.skus.find((s) => s.id === skuId) ?? initial;
  const images = product.images.length ? product.images : sku?.image ? [sku.image] : [];
  const shown = images[imageIndex] ?? images[0];

  useEffect(() => {
    trackPixel("ViewContent", {
      contents: [{ content_id: product.id, content_name: product.title, price: initial?.price }],
      value: initial?.price,
    });
  }, [product.id, product.title, initial?.price]);

  if (!sku) return null;
  const soldOut = sku.stock <= 0;

  function selectSku(id: string) {
    setSkuId(id);
    setQuantity(1);
    const next = product.skus.find((s) => s.id === id);
    const index = next?.image ? images.indexOf(next.image) : -1;
    if (index >= 0) setImageIndex(index);
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
          <div className="pdp-gallery__frame">
            <ProductImage src={shown} alt={product.title} sizes="(min-width: 900px) 520px, 100vw" priority />
          </div>
        </div>
        {images.length > 1 && (
          <div className="pdp-gallery__thumbs" role="group" aria-label={t.product.gallery}>
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                className={`pdp-gallery__thumb${i === imageIndex ? " is-active" : ""}`}
                onClick={() => setImageIndex(i)}
                aria-label={fmt(t.product.showImage, { n: i + 1 })}
                aria-pressed={i === imageIndex}
              >
                <ProductImage src={src} alt="" sizes="80px" />
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
                <label key={s.id} className={`option${s.stock <= 0 ? " is-disabled" : ""}`}>
                  <input
                    type="radio"
                    name="sku"
                    value={s.id}
                    checked={s.id === sku.id}
                    disabled={s.stock <= 0}
                    onChange={() => selectSku(s.id)}
                  />
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

        <a className="btn btn--tiktok btn--block" href={tiktokProductUrl(product.tiktokProductId)} target="_blank" rel="noopener">
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
