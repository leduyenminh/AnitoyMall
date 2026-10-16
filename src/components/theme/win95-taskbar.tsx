"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "../cart/cart-context";
import { useI18n } from "../i18n";
import { ThemeOptions } from "./theme-picker";

function Clock() {
  const { lang } = useI18n();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);
  return (
    <time className="taskbar__clock" dateTime={now?.toISOString()}>
      {now ? now.toLocaleTimeString(lang === "vi" ? "vi-VN" : "en-US", { hour: "numeric", minute: "2-digit" }) : ""}
    </time>
  );
}

/**
 * Windows 95 taskbar with a working Start menu. Always rendered but only displayed by the win95
 * theme's stylesheet, so switching themes never causes a hydration mismatch.
 */
export function Win95Taskbar() {
  const { t, href } = useI18n();
  const cart = useCart();
  const close = () => document.getElementById("start-menu")?.hidePopover?.();
  const links = [
    { href: href("/"), label: t.nav.home, icon: "🏠" },
    { href: href("/shop"), label: t.nav.shop, icon: "🛍️" },
    { href: href("/cart"), label: t.nav.cart, icon: "🧺" },
    { href: href("/about"), label: t.nav.about, icon: "📄" },
    { href: href("/help"), label: t.nav.help, icon: "❓" },
  ];
  return (
    <div className="taskbar" role="toolbar" aria-label="Taskbar">
      <button type="button" className="taskbar__start" popoverTarget="start-menu">
        <span className="taskbar__flag" aria-hidden="true" />
        {t.win95.start}
      </button>
      <div id="start-menu" popover="auto" className="start-menu">
        <div className="start-menu__rail" aria-hidden="true">
          <span>
            Anitoy<b>95</b>
          </span>
        </div>
        <div className="start-menu__items">
          <p className="start-menu__heading">{t.win95.programs}</p>
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="start-menu__item" onClick={close}>
              <span aria-hidden="true">{link.icon}</span> {link.label}
            </Link>
          ))}
          <hr />
          <p className="start-menu__heading">{t.theme.label}</p>
          <ThemeOptions name="theme-start" />
        </div>
      </div>
      <button type="button" className="taskbar__task" onClick={cart.open}>
        🧺 {t.nav.cart} ({cart.count})
      </button>
      <div className="taskbar__tray">
        <Clock />
      </div>
    </div>
  );
}
