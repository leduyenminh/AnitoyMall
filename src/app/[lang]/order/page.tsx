import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderLookup } from "@/components/checkout/order-lookup";
import { getDictionary } from "@/i18n";
import { isLocale } from "@/i18n/config";

// No personal data in the page itself (lookups go through the API), so it can be cached.
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).orderLookup.title, robots: { index: false, follow: false } };
}

export default async function OrderLookupPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  return (
    <div className="container page narrow order">
      <header className="page__head">
        <h1 className="page__title">{t.orderLookup.title}</h1>
        <p className="muted">{t.orderLookup.subtitle}</p>
      </header>
      <OrderLookup />
    </div>
  );
}
