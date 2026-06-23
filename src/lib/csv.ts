import { parse } from "csv-parse/sync";
import { z } from "zod";
import { slugify } from "./slug";

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

// One CSV row → one product. Columns mirror the template at
// public/templates/shop-witus-template.csv. Required: name, buy_url, alt_text.
export const productCsvRowSchema = z.object({
  name: z.string().trim().min(1).max(200),
  buy_url: z.string().trim().url().max(2048),
  price_cents: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  currency: z.preprocess(emptyToUndefined, z.string().trim().length(3).optional()),
  image_url: z.preprocess(emptyToUndefined, z.string().trim().url().max(2048).optional()),
  alt_text: z.string().trim().min(1).max(300),
  sku: z.preprocess(emptyToUndefined, z.string().trim().max(64).optional()),
  collection: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  sort_order: z.preprocess(emptyToUndefined, z.coerce.number().int().optional()),
});

export type ProductCsvRow = z.infer<typeof productCsvRowSchema>;

export interface ParsedCsv {
  valid: { row: number; data: ProductCsvRow }[];
  errors: { row: number; error: string }[];
}

export const MAX_CSV_ROWS = 500;

export function parseProductsCsv(text: string): ParsedCsv {
  let records: Record<string, string>[];
  try {
    records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    }) as Record<string, string>[];
  } catch (e) {
    return {
      valid: [],
      errors: [{ row: 0, error: e instanceof Error ? e.message : "Could not parse CSV" }],
    };
  }

  const valid: ParsedCsv["valid"] = [];
  const errors: ParsedCsv["errors"] = [];

  records.slice(0, MAX_CSV_ROWS).forEach((record, i) => {
    const row = i + 2; // account for the header line
    const parsed = productCsvRowSchema.safeParse(record);
    if (parsed.success) {
      valid.push({ row, data: parsed.data });
    } else {
      const first = parsed.error.issues[0];
      const field = first.path.join(".") || "row";
      errors.push({ row, error: `${field}: ${first.message}` });
    }
  });

  if (records.length > MAX_CSV_ROWS) {
    errors.push({
      row: 0,
      error: `Only the first ${MAX_CSV_ROWS} rows were imported (${records.length} found).`,
    });
  }

  return { valid, errors };
}

// Stable per-shop key for idempotent upsert: sku if present, else name.
export function buildLocalKey(row: { sku?: string; name: string }): string {
  return slugify(row.sku ?? row.name);
}
