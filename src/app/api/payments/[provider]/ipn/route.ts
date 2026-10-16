import { NextResponse, type NextRequest } from "next/server";
import { log } from "@/lib/log";
import { confirmPayment, verifyPayment } from "@/lib/payments";

// Server-to-server payment notifications. Each gateway expects its own response format; anything
// but a success answer makes it retry later.

/** ZaloPay (JSON { data, mac, type }) and MoMo (JSON IPN). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (provider !== "zalopay" && provider !== "momo") return new NextResponse(null, { status: 404 });
  const body = (await request.json().catch(() => null)) as Record<string, string> | null;
  const verified = body ? await verifyPayment(provider, {}, body) : null;

  if (provider === "zalopay") {
    if (!verified) return NextResponse.json({ return_code: -1, return_message: "mac not equal" });
    try {
      await confirmPayment(provider, verified);
      return NextResponse.json({ return_code: 1, return_message: "success" });
    } catch (error) {
      log.error("payment.ipn_failed", { provider, error: String(error) });
      return NextResponse.json({ return_code: 0, return_message: "retry" });
    }
  }

  // MoMo: 204 acknowledges the notification.
  if (!verified) return new NextResponse(null, { status: 400 });
  if (verified.success) await confirmPayment(provider, verified);
  return new NextResponse(null, { status: 204 });
}

/** VNPay IPN: GET with vnp_* params, answered with the RspCode VNPay specifies. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (provider !== "vnpay") return new NextResponse(null, { status: 404 });
  const verified = await verifyPayment(provider, Object.fromEntries(request.nextUrl.searchParams));
  if (!verified) return NextResponse.json({ RspCode: "97", Message: "Invalid signature" });
  if (!verified.success) return NextResponse.json({ RspCode: "00", Message: "Confirm Success" });
  try {
    const { result } = await confirmPayment(provider, verified);
    const answer = {
      paid: { RspCode: "00", Message: "Confirm Success" },
      already_paid: { RspCode: "02", Message: "Order already confirmed" },
      not_found: { RspCode: "01", Message: "Order not found" },
      amount_mismatch: { RspCode: "04", Message: "invalid amount" },
    }[result];
    return NextResponse.json(answer);
  } catch (error) {
    log.error("payment.ipn_failed", { provider, error: String(error) });
    return NextResponse.json({ RspCode: "99", Message: "Unknown error" });
  }
}
