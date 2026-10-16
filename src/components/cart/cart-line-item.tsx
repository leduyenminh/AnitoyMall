"use client";

import Link from "next/link";
import { fmt } from "@/i18n";
import { MAX_QTY_PER_LINE } from "@/lib/checkout/quote";
import { formatMoney } from "@/lib/money";
import { useI18n } from "../i18n";
import { MinusIcon, PlusIcon, TrashIcon } from "../icons";
import { ProductImage } from "../product/product-image";
import { useCart } from "./cart-context";
import type { CartLine } from "./cart-store";

export function QuantityStepper({
  value,
  max,
  onChange,
  label,
}: {
  value: number;
  max: number;
  onChange: (next: number) => void;
  label: string;
}) {
  const { t } = useI18n();
  const limit = Math.max(1, Math.min(max, MAX_QTY_PER_LINE));
  return (
    <div className="qty" role="group" aria-label={label}>
      <button type="button" className="qty__btn" onClick={() => onChange(value - 1)} aria-label={t.product.decrease} disabled={value <= 1}>
        <MinusIcon size={16} />
      </button>
      <input
        className="qty__input"
        type="number"
        inputMode="numeric"
        min={1}
        max={limit}
        value={value}
        aria-label={t.product.quantity}
        onChange={(e) => {
          const next = Number.parseInt(e.target.value, 10);
          if (Number.isFinite(next)) onChange(Math.min(Math.max(1, next), limit));
        }}
      />
      <button type="button" className="qty__btn" onClick={() => onChange(value + 1)} aria-label={t.product.increase} disabled={value >= limit}>
        <PlusIcon size={16} />
      </button>
    </div>
  );
}

export function CartLineItem({
  line,
  compact = false,
  notice,
  onNavigate,
}: {
  line: CartLine;
  compact?: boolean;
  notice?: string;
  onNavigate?: () => void;
}) {
  const { t, lang, href } = useI18n();
  const { setQuantity, remove } = useCart();
  const productHref = href(`/products/${line.slug}`);
  return (
    <li className={`cart-line${compact ? " cart-line--compact" : ""}`}>
      <Link href={productHref} className="cart-line__media" onClick={onNavigate} tabIndex={-1} aria-hidden="true">
        <ProductImage src={line.image} alt="" sizes="96px" />
      </Link>
      <div className="cart-line__info">
        <Link href={productHref} className="cart-line__title" onClick={onNavigate}>
          {line.title}
        </Link>
        <span className="cart-line__variant">{line.skuName}</span>
        {notice && <span className="cart-line__notice">{notice}</span>}
        <div className="cart-line__controls">
          <QuantityStepper
            value={line.quantity}
            max={line.maxQuantity}
            label={`${t.product.quantity}: ${line.title}`}
            onChange={(q) => setQuantity(line.productId, line.skuId, q)}
          />
          <button
            type="button"
            className="icon-btn icon-btn--soft"
            onClick={() => remove(line.productId, line.skuId)}
            aria-label={fmt(t.cart.removeItem, { title: line.title })}
          >
            <TrashIcon size={18} />
          </button>
        </div>
      </div>
      <span className="cart-line__total">{formatMoney(line.price * line.quantity, lang)}</span>
    </li>
  );
}
