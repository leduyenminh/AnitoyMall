import type { Dictionary } from "@/i18n";
import { fmt } from "@/i18n";
import { formatShortMoney } from "@/lib/money";
import { promoDescription, promoTitle } from "@/lib/promotions";
import { site } from "@/lib/site";
import type { Locale, Promotion } from "@/lib/types";
import { SparkleIcon, TikTokIcon } from "../icons";
import { Countdown, CopyCode } from "./promo-client";

/**
 * The running campaign and its vouchers, shown just under the header on the home page: visible at
 * a glance, but a single calm strip rather than a banner wall.
 */
export function CampaignBanner({
  campaigns,
  vouchers,
  lang,
  t,
}: {
  campaigns: Promotion[];
  vouchers: Promotion[];
  lang: Locale;
  t: Dictionary;
}) {
  const campaign = campaigns[0];
  if (!campaign && vouchers.length === 0) return null;
  const endsAt = campaign?.endsAt ?? vouchers[0]!.endsAt;
  const until = new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "en-GB", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(endsAt));

  return (
    <section className="promo-strip" aria-label={campaign ? promoTitle(campaign, lang) : t.promo.vouchers}>
      <div className="container promo-strip__inner">
        <div className="promo-strip__campaign">
          <span className="promo-strip__live">
            <SparkleIcon size={14} /> {t.promo.live}
          </span>
          <div className="promo-strip__text">
            <strong className="promo-strip__title">{campaign ? promoTitle(campaign, lang) : t.promo.vouchers}</strong>
            {campaign && promoDescription(campaign, lang) && <span className="promo-strip__desc">{promoDescription(campaign, lang)}</span>}
            <span className="promo-strip__meta">
              {fmt(t.promo.until, { date: until })} · <Countdown endsAt={endsAt} />
            </span>
          </div>
        </div>
        {vouchers.length > 0 && (
          <ul className="promo-strip__vouchers" aria-label={t.promo.vouchers}>
            {vouchers.map((v) => (
              <li key={v.id} className={`voucher-ticket${v.channel === "tiktok" ? " voucher-ticket--tiktok" : ""}`}>
                <div className="voucher-ticket__main">
                  <span className="voucher-ticket__value">{promoTitle(v, lang)}</span>
                  <span className="voucher-ticket__cond">
                    {v.minSpend ? fmt(t.promo.minSpend, { amount: formatShortMoney(v.minSpend) }) : null}
                    {v.maxDiscount ? ` · ${fmt(t.promo.upTo, { amount: formatShortMoney(v.maxDiscount) })}` : null}
                  </span>
                </div>
                {v.channel === "website" && v.code ? (
                  <CopyCode code={v.code} />
                ) : (
                  <a className="voucher-ticket__link" href={site.tiktok.shopUrl} target="_blank" rel="noopener">
                    <TikTokIcon size={13} /> {t.promo.onTikTok}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
