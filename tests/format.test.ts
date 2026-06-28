import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/format";

describe("formatPrice", () => {
  it("formats cents as USD", () => {
    expect(formatPrice(2499, "USD")).toBe("$24.99");
  });

  it("defaults to USD when currency is null", () => {
    expect(formatPrice(1500, null)).toBe("$15.00");
  });

  it("returns null when there's no price", () => {
    expect(formatPrice(null, "USD")).toBeNull();
  });

  it("supports other currencies", () => {
    expect(formatPrice(1000, "EUR")).toContain("10");
  });

  it("falls back gracefully on a malformed currency code", () => {
    expect(formatPrice(1000, "XX")).toContain("10.00");
  });
});
