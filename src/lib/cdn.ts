import { locales, localePath } from "@/i18n/config";
import { config } from "./config";

/** Storefront paths that render a product's data. */
export function productPaths(slugs: string[]): string[] {
  const paths = new Set<string>(["/sitemap.xml"]);
  for (const locale of locales) {
    paths.add(localePath(locale, "/"));
    paths.add(localePath(locale, "/shop"));
    for (const slug of slugs) paths.add(localePath(locale, `/products/${slug}`));
  }
  return [...paths];
}

/**
 * Ask CloudFront to drop cached copies of the given paths so catalog changes show up promptly.
 * No-op outside AWS. Above a handful of paths a wildcard is cheaper (it counts as one path).
 */
export async function invalidatePaths(paths: string[]): Promise<void> {
  if (!config.aws.distributionId || paths.length === 0) return;
  const items = paths.length > 25 ? ["/*"] : paths;
  const { CloudFrontClient, CreateInvalidationCommand } = await import("@aws-sdk/client-cloudfront");
  await new CloudFrontClient({ region: "us-east-1" }).send(
    new CreateInvalidationCommand({
      DistributionId: config.aws.distributionId,
      InvalidationBatch: { CallerReference: `anitoy-${Date.now()}`, Paths: { Quantity: items.length, Items: items } },
    }),
  );
}
