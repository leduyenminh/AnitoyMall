import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { getDictionary } from "@/i18n";
import { isLocale } from "@/i18n/config";
import { getPromotions } from "@/lib/data";
import { enabledPaymentMethods, loadPaymentSettings } from "@/lib/payments/settings";
import { livePromotions, promoTitle } from "@/lib/promotions";

// Rendered at runtime (then cached briefly) so live vouchers and configured gateways stay current.
export const revalidate = 120;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).checkout.title, robots: { index: false } };
}

export default async function CheckoutPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const [settings, promotions] = await Promise.all([loadPaymentSettings(), getPromotions()]);
  // Only website vouchers can be redeemed here; TikTok Shop vouchers are shown on the home page.
  const vouchers = livePromotions(promotions)
    .vouchers.filter((v) => v.channel === "website" && v.code)
    .map((v) => ({ code: v.code!, title: promoTitle(v, lang), ...(v.minSpend ? { minSpend: v.minSpend } : {}) }));
  return (
    <div className="container page">
      <header className="page__head">
        <h1 className="page__title">{t.checkout.title}</h1>
      </header>
      <CheckoutForm methods={enabledPaymentMethods(settings)} vouchers={vouchers} />
    </div>
  );
}
