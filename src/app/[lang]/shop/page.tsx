import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogBrowser, type CatalogItem } from "@/components/catalog/catalog-browser";
import { ProductCard } from "@/components/product/product-card";
import { Breadcrumbs } from "@/components/seo";
import { getDictionary } from "@/i18n";
import { isLocale, localePath } from "@/i18n/config";
import { isInStock, priceRange, searchText } from "@/lib/catalog";
import { getActiveProducts } from "@/lib/data";

export const revalidate = 120;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang);
  return {
    title: t.catalog.title,
    description: t.catalog.subtitle,
    alternates: { canonical: localePath(lang, "/shop"), languages: { vi: "/shop", en: "/en/shop" } },
  };
}

export default async function ShopPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const products = await getActiveProducts();

  const items: CatalogItem[] = products.map((p) => ({
    id: p.id,
    collection: p.collection,
    category: p.category,
    price: priceRange(p).min,
    inStock: isInStock(p),
    featured: p.featured,
    createdAt: p.createdAt,
    search: searchText(p),
  }));
  const cards = Object.fromEntries(
    products.map((p, i) => [p.id, <ProductCard key={p.id} product={p} lang={lang} t={t} priority={i < 2} />]),
  );

  return (
    <div className="container page">
      <Breadcrumbs
        label={t.common.breadcrumb}
        items={[{ name: t.nav.home, href: localePath(lang, "/") }, { name: t.catalog.title }]}
      />
      <header className="page__head">
        <h1 className="page__title">{t.catalog.title}</h1>
        <p className="muted">{t.catalog.subtitle}</p>
      </header>
      {/* Search params are read on the client so this page stays static and CDN-cacheable. */}
      <Suspense
        fallback={
          <div className="product-grid">
            {products.map((p) => (
              <div key={p.id} className="product-grid__cell">
                {cards[p.id]}
              </div>
            ))}
          </div>
        }
      >
        <CatalogBrowser items={items} cards={cards} />
      </Suspense>
    </div>
  );
}
