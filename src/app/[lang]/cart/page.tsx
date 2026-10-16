import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CartView } from "@/components/cart/cart-view";
import { getDictionary } from "@/i18n";
import { isLocale } from "@/i18n/config";

// Rendered at runtime (then cached) so absolute URLs use the deployed origin.
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).cart.title, robots: { index: false } };
}

export default async function CartPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  return (
    <div className="container page">
      <header className="page__head">
        <h1 className="page__title">{t.cart.title}</h1>
      </header>
      <CartView />
    </div>
  );
}
