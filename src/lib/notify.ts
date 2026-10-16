import { getDictionary, fmt } from "@/i18n";
import { localePath } from "@/i18n/config";
import { config } from "./config";
import { log } from "./log";
import { formatMoney } from "./money";
import { site } from "./site";
import type { Order } from "./types";

function orderUrl(order: Order) {
  return `${site.url}${localePath(order.locale, `/order/${order.id}`)}?t=${order.accessToken}`;
}

function orderText(order: Order): string {
  const t = getDictionary(order.locale);
  const money = (n: number) => formatMoney(n, order.locale, order.currency);
  return [
    fmt(t.order.title, { id: order.id }),
    "",
    ...order.lines.map((l) => `• ${l.title} (${l.skuName}) × ${l.quantity} — ${money(l.lineTotal)}`),
    "",
    `${t.cart.subtotal}: ${money(order.subtotal)}`,
    `${t.cart.shipping}: ${order.shippingFee ? money(order.shippingFee) : t.cart.free}`,
    `${t.cart.total}: ${money(order.total)}`,
    "",
    `${t.order.shipTo}: ${order.customer.name}, ${order.customer.phone}`,
    `${order.shippingAddress.street}, ${order.shippingAddress.ward}, ${order.shippingAddress.province}`,
    "",
    orderUrl(order),
  ].join("\n");
}

async function send(to: string, subject: string, text: string) {
  const { SESv2Client, SendEmailCommand } = await import("@aws-sdk/client-sesv2");
  await new SESv2Client({ region: config.aws.region }).send(
    new SendEmailCommand({
      FromEmailAddress: config.aws.sesFromEmail,
      Destination: { ToAddresses: [to] },
      Content: { Simple: { Subject: { Data: subject, Charset: "UTF-8" }, Body: { Text: { Data: text, Charset: "UTF-8" } } } },
    }),
  );
}

/** Email the customer (when they gave an address) and the seller. Requires a verified SES sender. */
export async function sendOrderEmails(order: Order): Promise<void> {
  if (!config.aws.sesFromEmail) {
    log.info("notify.skipped", { orderId: order.id, reason: "SES_FROM_EMAIL not set" });
    return;
  }
  const t = getDictionary(order.locale);
  const text = orderText(order);
  if (order.customer.email) await send(order.customer.email, `${t.order.thanks} – ${order.id}`, text);
  if (config.aws.sellerNotifyEmail) {
    await send(config.aws.sellerNotifyEmail, `[${site.shortName}] New order ${order.id} – ${formatMoney(order.total, "vi")}`, text);
  }
}
