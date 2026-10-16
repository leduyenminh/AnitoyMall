import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TikTokIcon } from "@/components/icons";
import { JsonLd } from "@/components/seo";
import { fmt, getDictionary } from "@/i18n";
import { isLocale, localePath } from "@/i18n/config";
import { formatMoney } from "@/lib/money";
import { site } from "@/lib/site";

// Rendered at runtime (then cached) so absolute URLs use the deployed origin.
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang);
  return {
    title: t.help.title,
    description: t.help.subtitle,
    alternates: { canonical: localePath(lang, "/help"), languages: { vi: "/help", en: "/en/help" } },
  };
}

export default async function HelpPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const values = {
    fee: formatMoney(site.shipping.flatFee, lang),
    threshold: formatMoney(site.shipping.freeThreshold, lang),
    days: site.shipping.etaDays,
  };
  const faqs = t.help.faqs.map((f) => ({ q: f.q, a: fmt(f.a, values) }));

  return (
    <div className="container page narrow">
      <header className="page__head">
        <h1 className="page__title">{t.help.title}</h1>
        <p className="muted">{t.help.subtitle}</p>
      </header>
      <div className="faq">
        {faqs.map((f, i) => (
          <details key={f.q} id={`faq-${i}`} className="faq__item window" open={i === 0}>
            <summary className="faq__q">{f.q}</summary>
            <p className="faq__a">{f.a}</p>
          </details>
        ))}
      </div>
      <section className="card window">
        <div className="window__titlebar" aria-hidden="true">
          <span className="window__title">{t.help.contact}</span>
        </div>
        <div className="card__body">
          <h2 className="card__title">{t.help.contact}</h2>
          <ul className="contact-list">
            <li>
              <a href={site.tiktok.profileUrl} target="_blank" rel="noopener">
                <TikTokIcon size={16} /> TikTok @{site.tiktok.handle}
              </a>
            </li>
            {site.contact.zalo && (
              <li>
                <a href={`https://zalo.me/${site.contact.zalo}`} target="_blank" rel="noopener">
                  Zalo {site.contact.zalo}
                </a>
              </li>
            )}
            {site.contact.phone && (
              <li>
                <a href={`tel:${site.contact.phone}`}>☎ {site.contact.phone}</a>
              </li>
            )}
            {site.contact.email && (
              <li>
                <a href={`mailto:${site.contact.email}`}>✉ {site.contact.email}</a>
              </li>
            )}
          </ul>
        </div>
      </section>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />
    </div>
  );
}
