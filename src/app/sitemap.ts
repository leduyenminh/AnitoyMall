import type { MetadataRoute } from "next";
import { localePath } from "@/i18n/config";
import { getActiveProducts } from "@/lib/data";
import { site } from "@/lib/site";

export const revalidate = 3600;

function entry(path: string, lastModified?: string, priority = 0.6): MetadataRoute.Sitemap[number] {
  return {
    url: `${site.url}${localePath("vi", path)}`,
    lastModified,
    priority,
    alternates: {
      languages: {
        vi: `${site.url}${localePath("vi", path)}`,
        en: `${site.url}${localePath("en", path)}`,
      },
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getActiveProducts();
  return [
    entry("/", undefined, 1),
    entry("/shop", undefined, 0.9),
    entry("/about", undefined, 0.3),
    entry("/help", undefined, 0.3),
    ...products.map((p) => entry(`/products/${p.slug}`, p.updatedAt, 0.8)),
  ];
}
