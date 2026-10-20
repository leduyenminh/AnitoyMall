// Shared by the checkout form (instant feedback) and the order API (authoritative validation).

/** Vietnamese mobile numbers: 0 or +84 followed by a 3/5/7/8/9 network prefix and 8 digits. */
const VN_PHONE = /^(?:\+?84|0)([35789]\d{8})$/;

export function normalisePhone(input: string): string | null {
  const digits = input.replace(/[\s.\-()]/g, "");
  const match = VN_PHONE.exec(digits);
  return match ? `0${match[1]}` : null;
}

export function isValidEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.trim());
}

/** Accepts "AT3K7PQ2X", "at3k7pq2x", "3K7PQ2X" or "AT 3K7 PQ2X" and returns "AT3K7PQ2X". */
export function normaliseOrderCode(input: string): string {
  const code = input.toUpperCase().replace(/[\s.\-]/g, "");
  return code.length === 7 ? `AT${code}` : code;
}

export function isOrderCode(id: string): boolean {
  return /^AT[A-Z0-9]{7}$/.test(id);
}

/** E.164 form used when hashing phone numbers for the TikTok Events API. */
export function phoneToE164(phone: string): string {
  return `+84${phone.replace(/^0/, "")}`;
}
