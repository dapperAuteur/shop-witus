import { describe, expect, it } from "vitest";
import { buildLocalKey, parseProductsCsv } from "@/lib/csv";

const HEADER =
  "name,buy_url,price_cents,currency,image_url,alt_text,sku,collection,sort_order";

describe("parseProductsCsv", () => {
  it("parses a valid row (row number accounts for the header)", () => {
    const csv = `${HEADER}\nMug,https://shop.example.com/mug,2499,USD,,A mug,MUG-1,Best Sellers,10`;
    const { valid, errors } = parseProductsCsv(csv);
    expect(errors).toHaveLength(0);
    expect(valid).toHaveLength(1);
    expect(valid[0]?.row).toBe(2);
    expect(valid[0]?.data.name).toBe("Mug");
    expect(valid[0]?.data.price_cents).toBe(2499);
  });

  it("reports per-row errors for missing required fields", () => {
    const csv = `${HEADER}\n,https://x.com,,,,,,,`; // missing name + alt_text
    const { valid, errors } = parseProductsCsv(csv);
    expect(valid).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.row).toBe(2);
  });

  it("rejects a non-URL buy_url", () => {
    const csv = `${HEADER}\nMug,not-a-url,,,,A mug,,,`;
    const { valid, errors } = parseProductsCsv(csv);
    expect(valid).toHaveLength(0);
    expect(errors[0]?.error).toMatch(/buy_url/);
  });

  it("treats empty optional fields as undefined", () => {
    const csv = `${HEADER}\nMug,https://x.com/mug,,,,A mug,,,`;
    const { valid } = parseProductsCsv(csv);
    expect(valid[0]?.data.price_cents).toBeUndefined();
    expect(valid[0]?.data.currency).toBeUndefined();
  });
});

describe("buildLocalKey", () => {
  it("prefers the sku", () => {
    expect(buildLocalKey({ sku: "MUG-1", name: "A Mug" })).toBe("mug-1");
  });
  it("falls back to the name when there is no sku", () => {
    expect(buildLocalKey({ name: "A Mug" })).toBe("a-mug");
  });
});
