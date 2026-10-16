"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { fmt } from "@/i18n";
import { categories, collections, slugify } from "@/lib/catalog";
import { trackPixel } from "../analytics/pixel";
import { useI18n } from "../i18n";
import { FilterIcon, SearchIcon } from "../icons";

export interface CatalogItem {
  id: string;
  collection: string;
  category: string;
  price: number;
  inStock: boolean;
  featured: number;
  createdAt: string;
  search: string;
}

type Sort = "featured" | "newest" | "price-asc" | "price-desc";
const sorts: Sort[] = ["featured", "newest", "price-asc", "price-desc"];

/**
 * Instant client-side search, filter and sort over the whole catalog. The product cards are
 * server-rendered once (children, keyed by product id); this component only decides which to
 * show and in what order, and keeps the state in the URL so results are shareable.
 */
export function CatalogBrowser({ items, cards }: { items: CatalogItem[]; cards: Record<string, React.ReactNode> }) {
  const { t, lang } = useI18n();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [query, setQuery] = useState(params.get("q") ?? "");
  const collection = params.get("collection") ?? "";
  const category = params.get("category") ?? "";
  const inStockOnly = params.get("stock") === "1";
  const sort = (sorts.includes(params.get("sort") as Sort) ? params.get("sort") : "featured") as Sort;

  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Debounce typing into the URL so history and analytics are not flooded.
  useEffect(() => {
    const handle = setTimeout(() => {
      if ((params.get("q") ?? "") === query) return;
      update({ q: query || undefined });
      if (query) trackPixel("Search", { query });
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const visible = useMemo(() => {
    const terms = slugify(query).split("-").filter(Boolean);
    const filtered = items.filter(
      (p) =>
        (!collection || p.collection === collection) &&
        (!category || p.category === category) &&
        (!inStockOnly || p.inStock) &&
        terms.every((term) => p.search.includes(term)),
    );
    const byStock = (a: CatalogItem, b: CatalogItem) => Number(b.inStock) - Number(a.inStock);
    const comparators: Record<Sort, (a: CatalogItem, b: CatalogItem) => number> = {
      featured: (a, b) => byStock(a, b) || b.featured - a.featured,
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
    };
    return filtered.sort(comparators[sort]);
  }, [items, query, collection, category, inStockOnly, sort]);

  const active = Boolean(query || collection || category || inStockOnly);
  const sortLabels: Record<Sort, string> = {
    featured: t.catalog.sortFeatured,
    newest: t.catalog.sortNewest,
    "price-asc": t.catalog.sortPriceAsc,
    "price-desc": t.catalog.sortPriceDesc,
  };

  return (
    <div className="catalog">
      <aside className="catalog__filters window" aria-label={t.catalog.filters}>
        <div className="window__titlebar" aria-hidden="true">
          <span className="window__title">{t.catalog.filters}</span>
        </div>
        <details className="filters" open>
          <summary className="filters__toggle">
            <FilterIcon size={18} /> {t.catalog.filters}
          </summary>
          <div className="filters__body">
            <div className="field">
              <label htmlFor="catalog-search" className="label">
                {t.nav.search}
              </label>
              <div className="input-icon">
                <SearchIcon size={18} />
                <input
                  id="catalog-search"
                  type="search"
                  className="input"
                  value={query}
                  placeholder={t.catalog.search}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            <fieldset className="filter-group">
              <legend className="label">{t.catalog.collection}</legend>
              <div className="chips">
                {[{ slug: "", name: { vi: t.catalog.all, en: t.catalog.all } }, ...collections].map((c) => (
                  <button
                    key={c.slug || "all"}
                    type="button"
                    className={`chip${collection === c.slug ? " is-active" : ""}`}
                    aria-pressed={collection === c.slug}
                    onClick={() => update({ collection: c.slug || undefined })}
                  >
                    {c.name[lang]}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="filter-group">
              <legend className="label">{t.catalog.category}</legend>
              <div className="chips">
                {[{ slug: "", name: { vi: t.catalog.all, en: t.catalog.all } }, ...categories].map((c) => (
                  <button
                    key={c.slug || "all"}
                    type="button"
                    className={`chip${category === c.slug ? " is-active" : ""}`}
                    aria-pressed={category === c.slug}
                    onClick={() => update({ category: c.slug || undefined })}
                  >
                    {c.name[lang]}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="check">
              <input type="checkbox" checked={inStockOnly} onChange={(e) => update({ stock: e.target.checked ? "1" : undefined })} />
              <span>{t.catalog.inStockOnly}</span>
            </label>

            {active && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  setQuery("");
                  router.replace(pathname, { scroll: false });
                }}
              >
                {t.catalog.clear}
              </button>
            )}
          </div>
        </details>
      </aside>

      <section className="catalog__results" aria-live="polite">
        <div className="catalog__toolbar">
          <p className="muted">{fmt(t.catalog.results, { n: visible.length })}</p>
          <label className="catalog__sort">
            <span className="sr-only">{t.catalog.sort}</span>
            <select className="select" value={sort} onChange={(e) => update({ sort: e.target.value === "featured" ? undefined : e.target.value })}>
              {sorts.map((s) => (
                <option key={s} value={s}>
                  {sortLabels[s]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {visible.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state__title">{t.catalog.noResults}</p>
            {active && (
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => {
                  setQuery("");
                  router.replace(pathname, { scroll: false });
                }}
              >
                {t.catalog.clear}
              </button>
            )}
          </div>
        ) : (
          <div className="product-grid">
            {visible.map((item) => (
              <div key={item.id} className="product-grid__cell">
                {cards[item.id]}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
