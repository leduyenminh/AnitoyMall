import type { Metadata, Viewport } from "next";
import { Baloo_2, Be_Vietnam_Pro } from "next/font/google";
import { notFound } from "next/navigation";
import { TikTokPixelWithConsent } from "@/components/analytics/consent";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Providers } from "@/components/providers";
import { JsonLd } from "@/components/seo";
import { themeScript } from "@/components/theme/theme-store";
import { Win95Taskbar } from "@/components/theme/win95-taskbar";
import { fmt, getDictionary } from "@/i18n";
import { isLocale, localePath, locales } from "@/i18n/config";
import { formatMoney } from "@/lib/money";
import { site } from "@/lib/site";
import "../../styles/tokens.css";
import "../../styles/base.css";
import "../../styles/components.css";
import "../../styles/pages.css";
import "../../styles/theme-win95.css";
import "../../styles/theme-aero.css";

const display = Baloo_2({ subsets: ["latin", "vietnamese"], variable: "--font-display-loaded", display: "swap" });
const body = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body-loaded",
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang);
  const description = fmt(t.meta.description, { amount: formatMoney(site.shipping.freeThreshold, lang) });
  return {
    metadataBase: new URL(site.url),
    title: { default: t.meta.title, template: `%s | ${site.name}` },
    description,
    applicationName: site.name,
    alternates: {
      canonical: localePath(lang, "/"),
      languages: { vi: "/", en: "/en", "x-default": "/" },
    },
    openGraph: {
      type: "website",
      siteName: site.name,
      title: t.meta.title,
      description,
      locale: lang === "vi" ? "vi_VN" : "en_US",
      url: localePath(lang, "/"),
    },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fffafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c10" },
  ],
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);

  return (
    <html lang={lang} data-theme="light" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers lang={lang} t={t}>
          <a href="#main" className="skip-link">
            {t.nav.skipToContent}
          </a>
          <div className="app">
            <SiteHeader lang={lang} t={t} />
            <main id="main" className="app__main">
              {children}
            </main>
            <SiteFooter lang={lang} t={t} />
          </div>
          <CartDrawer />
          <Win95Taskbar />
          <TikTokPixelWithConsent />
        </Providers>
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "OnlineStore",
            name: site.name,
            url: site.url,
            logo: `${site.url}/icon.png`,
            slogan: site.tagline,
            sameAs: [site.tiktok.profileUrl],
            ...(site.contact.email ? { email: site.contact.email } : {}),
            ...(site.contact.phone ? { telephone: site.contact.phone } : {}),
          }}
        />
      </body>
    </html>
  );
}
