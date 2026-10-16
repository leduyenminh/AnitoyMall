import { z } from "zod";
import { json, requireAdminMutation } from "@/lib/http";
import { applyOrderAction } from "@/lib/orders";
import { ConflictError } from "@/lib/repo";

const schema = z.object({ action: z.enum(["confirm", "mark_paid", "ship", "deliver", "cancel"]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid action" }, 400);
  try {
    const order = await applyOrderAction(id, parsed.data.action);
    return json({ id: order.id, status: order.status, paymentStatus: order.paymentStatus });
  } catch (error) {
    if (error instanceof ConflictError) return json({ error: error.message }, 409);
    return json({ error: String(error) }, 500);
  }
}
