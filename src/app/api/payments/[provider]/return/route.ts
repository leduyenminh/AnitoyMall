import { NextResponse, type NextRequest } from "next/server";
import { localePath } from "@/i18n/config";
import { publicOrigin } from "@/lib/http";
import { log } from "@/lib/log";
import { confirmPayment, isPaymentProvider, orderIdFromRef, verifyPayment } from "@/lib/payments";
import { getRepository } from "@/lib/repo";

/**
 * The shopper's browser comes back here from the gateway. The result is trusted only after its
 * signature checks out; then the order is updated (idempotently: the server notification may have
 * done it already) and the shopper lands on their order page.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const origin = publicOrigin(request);
  if (!isPaymentProvider(provider)) return NextResponse.redirect(`${origin}/`);

  const verified = await verifyPayment(provider, Object.fromEntries(request.nextUrl.searchParams));
  if (!verified) {
    log.warn("payment.return_unverified", { provider });
    return NextResponse.redirect(`${origin}/`);
  }
  if (verified.success) await confirmPayment(provider, verified);

  const order = await (await getRepository()).getOrder(orderIdFromRef(provider, verified.ref) ?? "");
  if (!order) return NextResponse.redirect(`${origin}/`);
  const outcome = order.paymentStatus === "paid" ? "success" : "failed";
  const target = `${origin}${localePath(order.locale, `/order/${order.id}`)}?t=${encodeURIComponent(order.accessToken)}&new=1&payment=${outcome}`;
  const response = NextResponse.redirect(target);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
