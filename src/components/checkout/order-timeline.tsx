import type { Dictionary } from "@/i18n/dictionaries/vi";
import type { OrderStatus } from "@/lib/types";

const steps: OrderStatus[] = ["pending", "confirmed", "shipped", "delivered"];

/** Order progress, shared by the order page and "find my order". */
export function OrderTimeline({ status, labels }: { status: OrderStatus; labels: Dictionary["order"]["statuses"] }) {
  if (status === "cancelled") return <p className="alert alert--error">{labels.cancelled}</p>;
  const current = steps.indexOf(status);
  return (
    <ol className="timeline">
      {steps.map((step, i) => (
        <li key={step} className={i <= current ? "is-done" : ""} aria-current={i === current ? "step" : undefined}>
          <span className="timeline__dot" aria-hidden="true" />
          {labels[step]}
        </li>
      ))}
    </ol>
  );
}
