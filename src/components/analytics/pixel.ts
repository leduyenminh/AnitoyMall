// TikTok Pixel helpers. The pixel only loads after the visitor accepts measurement cookies, and
// every call here is a no-op until then.

import { fromMinorUnits } from "@/lib/money";
import { site } from "@/lib/site";

type TtqEvent = "ViewContent" | "AddToCart" | "InitiateCheckout" | "PlaceAnOrder" | "CompletePayment" | "Search";

interface Ttq {
  track: (event: string, props?: Record<string, unknown>, options?: { event_id?: string }) => void;
  page: () => void;
  grantConsent?: () => void;
  revokeConsent?: () => void;
}

declare global {
  interface Window {
    ttq?: Ttq;
  }
}

export const CONSENT_KEY = "anitoy.consent";
const TTCLID_KEY = "anitoy.ttclid";

export function hasConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
}

/** Amounts are passed in minor units and converted to the decimal values TikTok expects. */
export function trackPixel(
  event: TtqEvent,
  props: { contents?: { content_id: string; content_name?: string; quantity?: number; price?: number }[]; value?: number; query?: string } = {},
  eventId?: string,
) {
  if (typeof window === "undefined" || !window.ttq || !hasConsent()) return;
  window.ttq.track(
    event,
    {
      content_type: "product",
      currency: site.currency,
      ...props,
      ...(props.value !== undefined ? { value: fromMinorUnits(props.value) } : {}),
      ...(props.contents
        ? { contents: props.contents.map((c) => ({ ...c, ...(c.price !== undefined ? { price: fromMinorUnits(c.price) } : {}) })) }
        : {}),
    },
    eventId ? { event_id: eventId } : undefined,
  );
}

/** Remember the TikTok ad click id from the landing URL so a later order can be attributed. */
export function captureClickId() {
  if (!hasConsent()) return;
  const ttclid = new URLSearchParams(window.location.search).get("ttclid");
  if (!ttclid) return;
  try {
    localStorage.setItem(TTCLID_KEY, JSON.stringify({ ttclid, expires: Date.now() + 7 * 864e5 }));
  } catch {
    // ignore
  }
}

/** Attribution sent with an order, only when the visitor consented. */
export function attribution(): { ttclid?: string; ttp?: string; pageUrl: string } | undefined {
  if (!hasConsent()) return undefined;
  let ttclid: string | undefined;
  try {
    const saved = JSON.parse(localStorage.getItem(TTCLID_KEY) ?? "null") as { ttclid: string; expires: number } | null;
    if (saved && saved.expires > Date.now()) ttclid = saved.ttclid;
  } catch {
    // ignore
  }
  const ttp = document.cookie.match(/(?:^|;\s*)_ttp=([^;]+)/)?.[1];
  return { ttclid, ttp, pageUrl: window.location.href };
}
