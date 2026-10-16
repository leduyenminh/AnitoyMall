import type { TtsNotification } from "../tiktok/types";

/** Work that happens after a request returns: queued on SQS in AWS, run in-process locally. */
export type DomainEvent =
  | { type: "order.created"; orderId: string }
  | { type: "order.cancelled"; orderId: string }
  | { type: "order.paid"; orderId: string }
  | { type: "tiktok.notification"; notification: TtsNotification }
  | { type: "catalog.sync"; reason: string };
