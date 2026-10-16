import Link from "next/link";
import type { Dictionary } from "@/i18n";
import { localePath } from "@/i18n/config";
import { collections } from "@/lib/catalog";
import { site } from "@/lib/site";
import type { Locale } from "@/lib/types";
import { CartButton } from "../cart/cart-button";
import { MenuIcon, SearchIcon, TikTokIcon } from "../icons";
import { ThemePicker } from "../theme/theme-picker";
import { LanguageSwitch } from "./language-switch";
import { Logo } from "./logo";

export function SiteHeader({ lang, t }: { lang: Locale; t: Dictionary }) {
  const href = (path: string) => localePath(lang, path);
  const collectionLinks = collections.map((c) => ({ href: `${href("/shop")}?collection=${c.slug}`, label: c.name[lang] }));
  const nav = [
    { href: href("/shop"), label: t.nav.shop },
    ...collectionLinks,
    { href: href("/about"), label: t.nav.about },
    { href: href("/help"), label: t.nav.help },
  ];
  // The desktop bar keeps the two main collections; the rest are in the shop filters and footer.
  const desktopNav = [nav[0]!, ...collectionLinks.slice(0, 2), { href: href("/help"), label: t.nav.help }];

  return (
    <header className="site-header">
      <div className="site-header__bar window__titlebar" aria-hidden="true">
        <span className="window__title">{site.name} – Internet Explorer</span>
        <span className="window__controls">
          <span />
          <span />
          <span />
        </span>
      </div>
      <div className="site-header__inner container">
        <details className="mobile-nav">
          <summary className="icon-btn" aria-label={t.nav.menu}>
            <MenuIcon />
          </summary>
          <nav className="mobile-nav__panel window" aria-label={t.nav.menu}>
            {nav.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </details>

        <Link href={href("/")} className="site-header__logo" aria-label={site.name}>
          <Logo />
        </Link>

        <nav className="site-nav" aria-label={t.nav.menu}>
          {desktopNav.map((item) => (
            <Link key={item.href} href={item.href} className="site-nav__link">
              {item.label}
            </Link>
          ))}
        </nav>

        <form action={href("/shop")} method="get" role="search" className="site-search">
          <label htmlFor="site-search" className="sr-only">
            {t.nav.search}
          </label>
          <SearchIcon size={18} />
          <input id="site-search" name="q" type="search" placeholder={t.catalog.search} className="site-search__input" />
        </form>

        <div className="site-header__actions">
          <a
            href={site.tiktok.profileUrl}
            className="icon-btn hide-sm"
            target="_blank"
            rel="noopener"
            aria-label={`TikTok @${site.tiktok.handle}`}
            title={`@${site.tiktok.handle}`}
          >
            <TikTokIcon />
          </a>
          <LanguageSwitch />
          <ThemePicker />
          <CartButton />
        </div>
      </div>
    </header>
  );
}
