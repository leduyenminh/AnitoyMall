import { describe, expect, it } from "vitest";
import { switchLocalePath, localePath } from "./config";
import { en } from "./dictionaries/en";
import { vi } from "./dictionaries/vi";

function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)]));
  }
  return typeof value;
}

function placeholders(value: unknown, prefix = ""): Record<string, string[]> {
  if (typeof value === "string") return { [prefix]: (value.match(/\{\w+\}/g) ?? []).sort() };
  if (value && typeof value === "object") {
    return Object.assign({}, ...Object.entries(value).map(([k, v]) => placeholders(v, `${prefix}.${k}`)));
  }
  return {};
}

describe("dictionaries", () => {
  it("have the same structure (including list lengths)", () => {
    expect(shape(en)).toEqual(shape(vi));
  });

  it("use the same placeholders in every string", () => {
    expect(placeholders(en)).toEqual(placeholders(vi));
  });
});

describe("locale paths", () => {
  it("serves Vietnamese unprefixed and English under /en", () => {
    expect(localePath("vi", "/shop")).toBe("/shop");
    expect(localePath("en", "/shop")).toBe("/en/shop");
    expect(localePath("en", "/")).toBe("/en");
    expect(switchLocalePath("/en/products/x", "vi")).toBe("/products/x");
    expect(switchLocalePath("/products/x", "en")).toBe("/en/products/x");
    expect(switchLocalePath("/en", "vi")).toBe("/");
  });
});
