import { describe, expect, it } from "vitest";
import { readableOn } from "@/lib/contrast";

describe("readableOn", () => {
  it("picks dark text on the light brand accent (#10b981)", () => {
    expect(readableOn("#10b981")).toBe("#111827");
  });

  it("picks white text on a dark color (WitUS navy)", () => {
    expect(readableOn("#020617")).toBe("#ffffff");
  });

  it("tolerates a missing # prefix", () => {
    expect(readableOn("10b981")).toBe("#111827");
  });

  it("falls back to white on invalid input", () => {
    expect(readableOn("nope")).toBe("#ffffff");
  });

  it("white on pure black, dark on pure white", () => {
    expect(readableOn("#000000")).toBe("#ffffff");
    expect(readableOn("#ffffff")).toBe("#111827");
  });
});
