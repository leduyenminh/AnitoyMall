import { config } from "../config";
import { log } from "../log";
import type { DomainEvent } from "./types";

let sqs: Promise<import("@aws-sdk/client-sqs").SQSClient> | undefined;

/**
 * Hand off follow-up work. On AWS the event goes to SQS and the events worker Lambda processes it
 * with retries and a dead-letter queue. Locally it runs in-process without blocking the caller.
 */
export async function publish(event: DomainEvent): Promise<void> {
  if (config.aws.eventsQueueUrl) {
    const { SQSClient, SendMessageCommand } = await import("@aws-sdk/client-sqs");
    sqs ??= Promise.resolve(new SQSClient({ region: config.aws.region }));
    await (await sqs).send(
      new SendMessageCommand({ QueueUrl: config.aws.eventsQueueUrl, MessageBody: JSON.stringify(event) }),
    );
    return;
  }
  const { handleEvent } = await import("./handlers");
  void handleEvent(event).catch((error) => log.error("events.inline_failed", { type: event.type, error: String(error) }));
}
