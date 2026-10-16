import type { SQSBatchResponse, SQSEvent } from "aws-lambda";
import { handleEvent } from "@/lib/events/handlers";
import type { DomainEvent } from "@/lib/events/types";
import { log } from "@/lib/log";

/**
 * SQS consumer for domain events (order side effects, TikTok webhooks, sync requests).
 * Failed messages are reported individually so only they are retried; after repeated failures
 * SQS moves them to the dead-letter queue, which raises a CloudWatch alarm.
 */
export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  const batchItemFailures: SQSBatchResponse["batchItemFailures"] = [];
  for (const record of event.Records) {
    let parsed: DomainEvent | undefined;
    try {
      parsed = JSON.parse(record.body) as DomainEvent;
      await handleEvent(parsed);
    } catch (error) {
      log.error("events.failed", {
        messageId: record.messageId,
        type: parsed?.type,
        attempt: record.attributes.ApproximateReceiveCount,
        error: error instanceof Error ? error.stack : String(error),
      });
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures };
}
