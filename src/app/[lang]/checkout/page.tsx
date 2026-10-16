import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { getDictionary } from "@/i18n";
import { isLocale } from "@/i18n/config";

// Rendered at runtime (then cached) so absolute URLs use the deployed origin.
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).checkout.title, robots: { index: false } };
}

export default async function CheckoutPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  return (
    <div className="container page">
      <header className="page__head">
        <h1 className="page__title">{t.checkout.title}</h1>
      </header>
      <CheckoutForm />
    </div>
  );
}
