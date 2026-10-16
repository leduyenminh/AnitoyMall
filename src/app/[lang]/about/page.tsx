import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TikTokIcon } from "@/components/icons";
import { getDictionary } from "@/i18n";
import { isLocale, localePath } from "@/i18n/config";
import { site } from "@/lib/site";

// Rendered at runtime (then cached) so absolute URLs use the deployed origin.
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang);
  return {
    title: t.about.title,
    description: t.about.lead,
    alternates: { canonical: localePath(lang, "/about"), languages: { vi: "/about", en: "/en/about" } },
  };
}

export default async function AboutPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  return (
    <div className="container page about">
      <div className="about__grid">
        <article className="card window">
          <div className="window__titlebar" aria-hidden="true">
            <span className="window__title">ABOUT.TXT</span>
          </div>
          <div className="card__body prose">
            <h1 className="page__title">{t.about.title}</h1>
            <p className="lead">{t.about.lead}</p>
            {t.about.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <p className="hero__actions">
              <Link href={localePath(lang, "/shop")} className="btn btn--primary">
                {t.home.shopNow}
              </Link>
              <a href={site.tiktok.profileUrl} className="btn btn--tiktok" target="_blank" rel="noopener">
                <TikTokIcon size={16} /> @{site.tiktok.handle}
              </a>
            </p>
          </div>
        </article>
        <div className="about__art">
          <Image src="/shop/videos/7627760395935091989-product.webp" alt="" fill sizes="(min-width: 900px) 420px, 90vw" />
        </div>
      </div>
    </div>
  );
}
