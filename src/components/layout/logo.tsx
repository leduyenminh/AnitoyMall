/** Wordmark: a small sparkle badge plus "Mall of Anitoy" in the display face. */
export function Logo() {
  return (
    <span className="logo">
      <svg className="logo__mark" width="34" height="34" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="18" fill="var(--logo-bg, #161823)" />
        <circle cx="32" cy="34" r="17" fill="#ffe6d5" />
        <path d="M15 34 Q16 14 32 13 Q48 14 49 34 L44 28 L40 33 L36 27 L32 32 L28 27 L24 33 L20 28 Z" fill="#eef0f6" />
        <circle cx="26" cy="37" r="3.2" fill="#3fa877" />
        <circle cx="38" cy="37" r="3.2" fill="#3fa877" />
        <path d="M30 43 Q32 45 34 43" stroke="#3a2a35" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M50 8 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" fill="#25f4ee" />
        <path d="M12 46 l1.5 3.5 l3.5 1.5 l-3.5 1.5 l-1.5 3.5 l-1.5 -3.5 l-3.5 -1.5 l3.5 -1.5 z" fill="#fe2c55" />
      </svg>
      <span className="logo__text">
        <span className="logo__small">Mall of</span>
        <span className="logo__big">Anitoy</span>
      </span>
    </span>
  );
}
