import { describe, expect, it } from "vitest";
import { formatMoney, toMinorUnits } from "../money";
import { isOrderCode, isValidEmail, normaliseOrderCode, normalisePhone, phoneToE164 } from "./validation";

describe("normalisePhone", () => {
  it("accepts common Vietnamese mobile formats", () => {
    expect(normalisePhone("0912345678")).toBe("0912345678");
    expect(normalisePhone("0912 345 678")).toBe("0912345678");
    expect(normalisePhone("+84 912.345.678")).toBe("0912345678");
    expect(normalisePhone("84387654321")).toBe("0387654321");
  });

  it("rejects landlines, short numbers and junk", () => {
    expect(normalisePhone("0212345678")).toBeNull();
    expect(normalisePhone("091234567")).toBeNull();
    expect(normalisePhone("hello")).toBeNull();
  });

  it("produces E.164 for the Events API", () => {
    expect(phoneToE164("0912345678")).toBe("+84912345678");
  });
});

describe("normaliseOrderCode", () => {
  it("accepts the code with or without AT, in any case, with spaces", () => {
    expect(normaliseOrderCode("AT3K7PQ2X")).toBe("AT3K7PQ2X");
    expect(normaliseOrderCode("at3k7pq2x")).toBe("AT3K7PQ2X");
    expect(normaliseOrderCode("3K7PQ2X")).toBe("AT3K7PQ2X");
    expect(normaliseOrderCode(" AT 3K7 PQ2X ")).toBe("AT3K7PQ2X");
    // A 7-character code that itself starts with AT still gets the prefix.
    expect(normaliseOrderCode("ATXY234")).toBe("ATATXY234");
    expect(isOrderCode(normaliseOrderCode("3K7PQ"))).toBe(false);
  });
});

describe("isValidEmail", () => {
  it("validates basic email shape", () => {
    expect(isValidEmail("a@b.vn")).toBe(true);
    expect(isValidEmail("a@b")).toBe(false);
  });
});

describe("money", () => {
  it("handles VND (no minor units)", () => {
    expect(toMinorUnits("79000", "VND")).toBe(79000);
    expect(formatMoney(79000, "vi", "VND").replace(/\s/g, " ")).toBe("79.000 ₫");
  });

  it("handles two-decimal currencies", () => {
    expect(toMinorUnits("12.99", "USD")).toBe(1299);
    expect(formatMoney(1299, "en", "USD")).toBe("$12.99");
  });
});
