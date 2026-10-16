"use client";

import Script from "next/script";
import { useSyncExternalStore } from "react";
import { site } from "@/lib/site";
import { useI18n } from "../i18n";
import { captureClickId, CONSENT_KEY } from "./pixel";

type Consent = "granted" | "denied" | "unset";

const listeners = new Set<() => void>();
const consentStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): Consent {
    try {
      const value = localStorage.getItem(CONSENT_KEY);
      return value === "granted" || value === "denied" ? value : "unset";
    } catch {
      return "unset";
    }
  },
  // Render nothing on the server; the banner appears after hydration if needed.
  getServerSnapshot: (): Consent => "denied",
  set(value: Exclude<Consent, "unset">) {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // ignore
    }
    listeners.forEach((l) => l());
  },
};

const pixelLoader = (pixelId: string) =>
  `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=d.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=d.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};ttq.load(${JSON.stringify(pixelId)});ttq.page();}(window,document,"ttq");`;

/**
 * Loads the TikTok Pixel only after the visitor opts in, and asks once. Without a configured
 * pixel id nothing is rendered at all.
 */
export function TikTokPixelWithConsent() {
  const { t } = useI18n();
  const consent = useSyncExternalStore(consentStore.subscribe, consentStore.getSnapshot, consentStore.getServerSnapshot);
  if (!site.pixelId) return null;

  if (consent === "granted") {
    return <Script id="tiktok-pixel" strategy="afterInteractive" onReady={captureClickId}>{pixelLoader(site.pixelId)}</Script>;
  }
  if (consent === "denied") return null;

  return (
    <div className="consent window" role="region" aria-label="Cookies">
      <div className="window__titlebar" aria-hidden="true">
        <span className="window__title">Cookies</span>
      </div>
      <div className="consent__body">
        <p>{t.consent.text}</p>
        <div className="consent__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => consentStore.set("denied")}>
            {t.consent.decline}
          </button>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => consentStore.set("granted")}>
            {t.consent.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
