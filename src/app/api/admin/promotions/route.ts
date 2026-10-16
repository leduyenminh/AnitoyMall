import { json, requireAdminMutation } from "@/lib/http";
import { codeTaken, promotionInputSchema, toPromotion } from "@/lib/promotion-input";
import { getRepository } from "@/lib/repo";

/** Create or update a campaign / voucher. */
export async function POST(request: Request) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;
  const parsed = promotionInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: parsed.error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ") }, 400);
  }
  const repo = await getRepository();
  const all = await repo.listPromotions();
  const existing = parsed.data.id ? all.find((p) => p.id === parsed.data.id) : undefined;
  if (parsed.data.id && !existing) return json({ error: "not found" }, 404);
  const promotion = toPromotion(parsed.data, existing);
  if (promotion.channel === "website" && codeTaken(promotion.code, promotion.id, all)) {
    return json({ error: `code ${promotion.code} is already used` }, 409);
  }
  await repo.putPromotion(promotion);
  return json({ promotion });
}
