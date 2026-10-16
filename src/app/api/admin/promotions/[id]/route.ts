import { json, requireAdminMutation } from "@/lib/http";
import { getRepository } from "@/lib/repo";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;
  const { id } = await params;
  await (await getRepository()).deletePromotion(id);
  return json({ ok: true });
}
