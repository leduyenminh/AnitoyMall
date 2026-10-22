import Link from "next/link";
import type { Dictionary } from "@/i18n";
import { fmt } from "@/i18n";
import { localePath } from "@/i18n/config";
import { categories, collections } from "@/lib/catalog";
import { bankTransferEnabled, site } from "@/lib/site";
import type { Locale } from "@/lib/types";
import { TikTokIcon } from "../icons";
import { Logo } from "./logo";

export function SiteFooter({ lang, t }: { lang: Locale; t: Dictionary }) {
  const href = (path: string) => localePath(lang, path);
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div className="site-footer__brand">
          <Logo />
          <p className="muted">{t.footer.about}</p>
          <a className="btn btn--tiktok btn--sm" href={site.tiktok.profileUrl} target="_blank" rel="noopener">
            <TikTokIcon size={16} /> @{site.tiktok.handle}
          </a>
        </div>
        <nav aria-label={t.footer.shop}>
          <h2 className="site-footer__heading">{t.footer.shop}</h2>
          <ul>
            <li>
              <Link href={href("/shop")}>{t.catalog.title}</Link>
            </li>
            {collections.map((c) => (
              <li key={c.slug}>
                <Link href={`${href("/shop")}?collection=${c.slug}`}>{c.name[lang]}</Link>
              </li>
            ))}
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`${href("/shop")}?category=${c.slug}`}>{c.name[lang]}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t.footer.support}>
          <h2 className="site-footer__heading">{t.footer.support}</h2>
          <ul>
            <li>
              <Link href={href("/order")}>{t.nav.trackOrder}</Link>
            </li>
            <li>
              <Link href={`${href("/help")}#faq-0`}>{t.footer.shipping}</Link>
            </li>
            <li>
              <Link href={`${href("/help")}#faq-2`}>{t.footer.payment}</Link>
            </li>
            <li>
              <Link href={`${href("/help")}#faq-4`}>{t.footer.returns}</Link>
            </li>
            <li>
              <Link href={href("/about")}>{t.nav.about}</Link>
            </li>
            {site.contact.phone && (
              <li>
                <a href={`tel:${site.contact.phone}`}>{site.contact.phone}</a>
              </li>
            )}
            {site.contact.email && (
              <li>
                <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
              </li>
            )}
          </ul>
        </nav>
        <div>
          <h2 className="site-footer__heading">{t.footer.payment}</h2>
          <ul className="pay-badges">
            <li className="badge">COD</li>
            {bankTransferEnabled && <li className="badge">VietQR</li>}
            <li className="badge">TikTok Shop</li>
          </ul>
        </div>
      </div>
      <div className="container site-footer__legal">
        <span>{fmt(t.footer.rights, { year: new Date().getFullYear() })}</span>
        <span className="muted">{site.tagline}</span>
      </div>
    </footer>
  );
}
