import Image from "next/image";

/** The shop's TikTok profile picture next to "Mall of Anitoy". */
export function Logo() {
  return (
    <span className="logo">
      <Image className="logo__mark" src="/shop/avatar.webp" alt="" width={36} height={36} loading="eager" />
      <span className="logo__text">
        <span className="logo__small">Mall of</span>
        <span className="logo__big">Anitoy</span>
      </span>
    </span>
  );
}
