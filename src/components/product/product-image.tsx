import Image from "next/image";

/**
 * Product image with responsive sizes. Local SVG illustrations are served as-is; photos from
 * TikTok Shop or our media CDN go through Next's optimiser (AVIF/WebP, resized per device).
 */
export function ProductImage({
  src,
  alt,
  sizes,
  priority = false,
  className,
}: {
  src: string | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  if (!src) return <div className={`product-image product-image--empty ${className ?? ""}`} aria-hidden="true" />;
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      preload={priority}
      loading={priority ? "eager" : "lazy"}
      unoptimized={src.endsWith(".svg")}
      className={`product-image ${className ?? ""}`}
    />
  );
}
