import { z } from "zod";
import { buildQuote } from "@/lib/checkout/quote";
import { json } from "@/lib/http";
import { getRepository } from "@/lib/repo";

const schema = z.object({
  locale: z.enum(["vi", "en"]),
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(100),
        skuId: z.string().min(1).max(100),
        quantity: z.number().int().min(1).max(99),
        price: z.number().int().nonnegative().optional(),
      }),
    )
    .max(50),
});

/** Authoritative prices, stock and shipping for a cart. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid" }, 400);
  const { items, locale } = parsed.data;
  const products = await (await getRepository()).getProducts(items.map((i) => i.productId));
  return json(buildQuote(items, products, locale));
}
