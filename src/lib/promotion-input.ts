import { randomUUID } from "node:crypto";
import { z } from "zod";
import { normaliseCode } from "./promotions";
import type { Promotion } from "./types";

// Validation for the admin promotions editor. Dates arrive from <input type="datetime-local">
// and are read as Vietnam time (UTC+7, no daylight saving).

const vnLocal = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/, "Use YYYY-MM-DDTHH:mm")
  .transform((v) => `${v.length === 16 ? `${v}:00` : v}.000+07:00`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

const optionalVnd = z.number().int().min(0).max(100_000_000).optional();

export const promotionInputSchema = z
  .object({
    id: z.string().min(1).max(80).optional(),
    kind: z.enum(["campaign", "voucher"]),
    channel: z.enum(["website", "tiktok"]),
    title: z.string().trim().min(1).max(80),
    titleEn: optionalText(80),
    description: optionalText(200),
    descriptionEn: optionalText(200),
    code: z
      .string()
      .trim()
      .max(20)
      .optional()
      .transform((v) => (v ? normaliseCode(v) : undefined))
      .refine((v) => v === undefined || /^[A-Z0-9]{3,20}$/.test(v), "Code: 3–20 letters or digits"),
    discountType: z.enum(["amount", "percent"]).optional(),
    discountValue: z.number().int().positive().max(100_000_000).optional(),
    maxDiscount: optionalVnd,
    minSpend: optionalVnd,
    startsAt: vnLocal,
    endsAt: vnLocal,
    active: z.boolean(),
  })
  .superRefine((p, ctx) => {
    if (Date.parse(p.endsAt) <= Date.parse(p.startsAt)) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "End must be after start" });
    }
    if (p.kind === "voucher" && p.channel === "website") {
      if (!p.code) ctx.addIssue({ code: "custom", path: ["code"], message: "Website vouchers need a code" });
      if (!p.discountType || !p.discountValue) {
        ctx.addIssue({ code: "custom", path: ["discountValue"], message: "Website vouchers need a discount" });
      }
    }
    if (p.discountType === "percent" && (p.discountValue ?? 0) > 100) {
      ctx.addIssue({ code: "custom", path: ["discountValue"], message: "Percent must be 1–100" });
    }
  });

export type PromotionInput = z.input<typeof promotionInputSchema>;

/** Build the stored promotion; campaigns carry no discount fields of their own. */
export function toPromotion(input: z.output<typeof promotionInputSchema>, existing?: Promotion, now = new Date()): Promotion {
  const stamp = now.toISOString();
  const isVoucher = input.kind === "voucher";
  const promotion: Promotion = {
    id: existing?.id ?? input.id ?? `promo-${randomUUID().slice(0, 8)}`,
    kind: input.kind,
    channel: input.channel,
    title: input.title,
    titleEn: input.titleEn,
    description: input.description,
    descriptionEn: input.descriptionEn,
    code: isVoucher ? input.code : undefined,
    discountType: isVoucher && input.discountValue ? input.discountType : undefined,
    discountValue: isVoucher && input.discountType ? input.discountValue : undefined,
    maxDiscount: isVoucher && input.discountType === "percent" ? input.maxDiscount || undefined : undefined,
    minSpend: input.minSpend || undefined,
    startsAt: new Date(input.startsAt).toISOString(),
    endsAt: new Date(input.endsAt).toISOString(),
    active: input.active,
    createdAt: existing?.createdAt ?? stamp,
    updatedAt: stamp,
  };
  // Drop undefined keys so JSON and DynamoDB items stay tidy.
  return Object.fromEntries(Object.entries(promotion).filter(([, v]) => v !== undefined)) as unknown as Promotion;
}

/** A website code may only belong to one website voucher. */
export function codeTaken(code: string | undefined, id: string, all: Promotion[]): boolean {
  if (!code) return false;
  return all.some((p) => p.id !== id && p.channel === "website" && p.code && normaliseCode(p.code) === code);
}
