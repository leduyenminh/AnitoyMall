import { cache } from "react";
import { getRepository } from "./repo";

// Request-scoped memoisation so a page and its metadata share one read.

export const getActiveProducts = cache(async () => {
  const products = await (await getRepository()).listProducts();
  return products.sort((a, b) => b.featured - a.featured || b.createdAt.localeCompare(a.createdAt));
});

export const getProductBySlug = cache(async (slug: string) => {
  const product = await (await getRepository()).getProductBySlug(slug);
  return product && product.status === "active" ? product : null;
});
