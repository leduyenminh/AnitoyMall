import { describe, expect, it } from "vitest";
import { formatMoney, toMinorUnits } from "../money";
import { isValidEmail, normalisePhone, phoneToE164 } from "./validation";

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
