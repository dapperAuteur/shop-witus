import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugify("Best Sellers")).toBe("best-sellers");
  });

  it("collapses punctuation runs into a single hyphen", () => {
    expect(slugify("Hand-thrown   Mug!!")).toBe("hand-thrown-mug");
  });

  it("keeps the base letter when stripping accents", () => {
    expect(slugify("Café")).toBe("cafe");
  });

  it("trims leading/trailing separators", () => {
    expect(slugify("  --Hello--  ")).toBe("hello");
  });

  it("falls back to 'item' for empty or symbol-only input", () => {
    expect(slugify("!!!")).toBe("item");
    expect(slugify("")).toBe("item");
  });

  it("caps length at 64", () => {
    expect(slugify("a".repeat(100))).toHaveLength(64);
  });
});
