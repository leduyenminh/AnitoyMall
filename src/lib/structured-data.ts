import { collectionName, productDescription, productTitle, skuName } from "./catalog";
import {
  deliveryDays,
  hasVariants,
  MERCHANT_COUNTRY,
  merchantImages,
  merchantItemId,
  productUrl,
  shippingFeeFor,
} from "./merchant";
import { fromMinorUnits } from "./money";
import { site } from "./site";
import type { Locale, Product, Sku } from "./types";

// Product structured data for Google merchant listings:
// https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
// Variants follow https://developers.google.com/search/docs/appearance/structured-data/product-variants

type JsonLd = Record<string, unknown>;

const schema = (name: string) => `https://schema.org/${name}`;

function shippingDetails(sku: Sku): JsonLd {
  const days = deliveryDays();
  return {
    "@type": "OfferShippingDetails",
    shippingRate: { "@type": "MonetaryAmount", value: fromMinorUnits(shippingFeeFor(sku)), currency: site.currency },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: MERCHANT_COUNTRY },
    ...(days
      ? {
          deliveryTime: {
            "@type": "ShippingDeliveryTime",
            // The site quotes one door-to-door window, so all of it counts as transit time.
            handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 0, unitCode: "DAY" },
            transitTime: { "@type": "QuantitativeValue", minValue: days.min, maxValue: days.max, unitCode: "DAY" },
          },
        }
      : {}),
  };
}

/** See `site.returns`: by default only damaged items are replaced, which Google treats as no returns. */
function returnPolicy(): JsonLd {
  const { days } = site.returns;
  if (days <= 0) {
    return {
      "@type": "MerchantReturnPolicy",
      applicableCountry: MERCHANT_COUNTRY,
      returnPolicyCategory: schema("MerchantReturnNotPermitted"),
    };
  }
  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: MERCHANT_COUNTRY,
    returnPolicyCountry: MERCHANT_COUNTRY,
    returnPolicyCategory: schema("MerchantReturnFiniteReturnWindow"),
    merchantReturnDays: days,
    returnMethod: schema("ReturnByMail"),
    refundType: schema("ExchangeRefund"),
    itemDefectReturnFees: schema("FreeReturn"),
  };
}

function offer(sku: Sku, url: string): JsonLd {
  const compareAt = sku.compareAtPrice !== undefined && sku.compareAtPrice > sku.price ? sku.compareAtPrice : undefined;
  return {
    "@type": "Offer",
    url,
    price: fromMinorUnits(sku.price),
    priceCurrency: site.currency,
    ...(compareAt
      ? {
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            priceType: schema("StrikethroughPrice"),
            price: fromMinorUnits(compareAt),
            priceCurrency: site.currency,
          },
        }
      : {}),
    availability: schema(sku.stock > 0 ? "InStock" : "OutOfStock"),
    itemCondition: schema("NewCondition"),
    shippingDetails: shippingDetails(sku),
    hasMerchantReturnPolicy: returnPolicy(),
  };
}

/**
 * A `Product` with one `Offer`, or for a product sold in variants a `ProductGroup` with one
 * `Product` per SKU. Ids and links match the Merchant Center feed items.
 */
export function productJsonLd(product: Product, locale: Locale): JsonLd {
  const name = productTitle(product, locale);
  const url = productUrl(product, locale);
  const common: JsonLd = {
    "@context": "https://schema.org",
    name,
    description: productDescription(product, locale),
    image: merchantImages(product),
    brand: { "@type": "Brand", name: site.name },
    category: collectionName(product.collection, locale),
    url,
    ...(product.rating
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating.value, reviewCount: product.rating.count } }
      : {}),
  };

  const [first] = product.skus;
  if (!hasVariants(product)) {
    return {
      ...common,
      "@type": "Product",
      sku: product.id,
      ...(first ? { offers: offer(first, url) } : {}),
    };
  }

  return {
    ...common,
    "@type": "ProductGroup",
    productGroupID: product.id,
    variesBy: [schema("pattern")],
    hasVariant: product.skus.map((sku) => {
      const variant = skuName(product, sku, locale);
      return {
        "@type": "Product",
        name: `${name} - ${variant}`,
        sku: merchantItemId(product, sku),
        image: merchantImages(product, sku)[0],
        pattern: variant,
        offers: offer(sku, productUrl(product, locale, sku)),
      };
    }),
  };
}
