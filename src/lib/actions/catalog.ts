"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db/client";
import { buildLocalKey, parseProductsCsv } from "@/lib/csv";
import { notifyCollectionPublished, notifyProductsImported } from "@/lib/ecosystem-events";
import { err, ok, type Result } from "@/lib/result";
import { requireShopRole } from "@/lib/rbac";
import { slugify } from "@/lib/slug";

const MAX_CSV_BYTES = 1_000_000;

function revalidateShop(shopId: string) {
  revalidatePath(`/dashboard/${shopId}`);
  revalidatePath(`/dashboard/${shopId}/import`);
  // Refresh the public shop pages so catalog changes go live immediately
  // (the /s route is ISR with a 5-min fallback).
  revalidatePath("/s/[shopSlug]", "page");
}

// Find-or-create a collection per distinct name; returns name(lowercased) → id.
async function ensureCollections(
  shopId: string,
  names: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const name of names) {
    const slug = slugify(name);
    const [existing] = await db
      .select({ id: schema.collections.id })
      .from(schema.collections)
      .where(and(eq(schema.collections.shopId, shopId), eq(schema.collections.slug, slug)))
      .limit(1);
    if (existing) {
      map.set(name.toLowerCase(), existing.id);
      continue;
    }
    const [created] = await db
      .insert(schema.collections)
      .values({ shopId, slug, name })
      .onConflictDoNothing()
      .returning({ id: schema.collections.id });
    if (created) {
      map.set(name.toLowerCase(), created.id);
    } else {
      const [again] = await db
        .select({ id: schema.collections.id })
        .from(schema.collections)
        .where(and(eq(schema.collections.shopId, shopId), eq(schema.collections.slug, slug)))
        .limit(1);
      if (again) map.set(name.toLowerCase(), again.id);
    }
  }
  return map;
}

export async function importProductsCsv(
  formData: FormData,
): Promise<Result<{ imported: number; skipped: { row: number; error: string }[] }>> {
  const shopId = String(formData.get("shopId") ?? "");
  if (!shopId) return err("Missing shop.", "invalid_input");
  await requireShopRole(shopId, "manager");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return err("Choose a CSV file.", "no_file");
  if (file.size > MAX_CSV_BYTES) return err("CSV is too large (max 1 MB).", "too_large");

  const text = await file.text();
  const { valid, errors } = parseProductsCsv(text);

  if (valid.length === 0) {
    return ok({ imported: 0, skipped: errors });
  }

  const collectionNames = [
    ...new Set(valid.map((v) => v.data.collection).filter((c): c is string => Boolean(c))),
  ];
  const collMap = await ensureCollections(shopId, collectionNames);

  // De-dupe within the batch (last row wins) so a single INSERT … ON CONFLICT
  // never touches the same (shop_id, local_key) twice.
  const byKey = new Map<string, typeof schema.products.$inferInsert>();
  for (const { data } of valid) {
    const localKey = buildLocalKey(data);
    byKey.set(localKey, {
      shopId,
      collectionId: data.collection ? (collMap.get(data.collection.toLowerCase()) ?? null) : null,
      localKey,
      name: data.name,
      buyUrl: data.buy_url,
      priceCents: data.price_cents ?? null,
      currency:
        data.currency?.toUpperCase() ?? (data.price_cents != null ? "USD" : null),
      imageUrl: data.image_url ?? null,
      altText: data.alt_text,
      sku: data.sku ?? null,
      source: "csv",
      sortOrder: data.sort_order ?? 0,
    });
  }

  const values = [...byKey.values()];
  await db
    .insert(schema.products)
    .values(values)
    .onConflictDoUpdate({
      target: [schema.products.shopId, schema.products.localKey],
      set: {
        name: sql`excluded.name`,
        collectionId: sql`excluded.collection_id`,
        buyUrl: sql`excluded.buy_url`,
        priceCents: sql`excluded.price_cents`,
        currency: sql`excluded.currency`,
        imageUrl: sql`excluded.image_url`,
        altText: sql`excluded.alt_text`,
        sku: sql`excluded.sku`,
        source: sql`excluded.source`,
        sortOrder: sql`excluded.sort_order`,
        updatedAt: sql`now()`,
      },
    });

  after(() => notifyProductsImported({ shopId, count: values.length, source: "csv" }));
  revalidateShop(shopId);
  return ok({ imported: values.length, skipped: errors });
}

const newCollectionSchema = z.object({
  shopId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
});

export async function createCollection(formData: FormData): Promise<Result<{ id: string }>> {
  const parsed = newCollectionSchema.safeParse({
    shopId: formData.get("shopId"),
    name: formData.get("name"),
  });
  if (!parsed.success) return err("Enter a collection name.", "invalid_input");
  await requireShopRole(parsed.data.shopId, "manager");

  const slug = slugify(parsed.data.name);
  const [row] = await db
    .insert(schema.collections)
    .values({ shopId: parsed.data.shopId, slug, name: parsed.data.name })
    .onConflictDoNothing()
    .returning({ id: schema.collections.id });
  if (!row) return err("A collection with that name already exists.", "duplicate");

  revalidateShop(parsed.data.shopId);
  return ok({ id: row.id });
}

const collectionStatusSchema = z.object({
  shopId: z.string().uuid(),
  collectionId: z.string().uuid(),
  status: z.enum(["draft", "published"]),
});

export async function setCollectionStatus(formData: FormData): Promise<Result<null>> {
  const parsed = collectionStatusSchema.safeParse({
    shopId: formData.get("shopId"),
    collectionId: formData.get("collectionId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return err("Invalid request.", "invalid_input");
  await requireShopRole(parsed.data.shopId, "manager");

  // Publish gate: a collection with no active products is dead UI in the
  // widget, so block publishing it (the analogue of Wanderlearn's no_lessons).
  if (parsed.data.status === "published") {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.products)
      .where(
        and(
          eq(schema.products.shopId, parsed.data.shopId),
          eq(schema.products.collectionId, parsed.data.collectionId),
          eq(schema.products.status, "active"),
        ),
      );
    if (!row || row.count === 0) {
      return err("Add at least one active product before publishing.", "no_active_products");
    }
  }

  await db
    .update(schema.collections)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(
      and(
        eq(schema.collections.id, parsed.data.collectionId),
        eq(schema.collections.shopId, parsed.data.shopId),
      ),
    );
  if (parsed.data.status === "published") {
    after(() =>
      notifyCollectionPublished({
        shopId: parsed.data.shopId,
        collectionId: parsed.data.collectionId,
      }),
    );
  }
  revalidateShop(parsed.data.shopId);
  return ok(null);
}

const productStatusSchema = z.object({
  shopId: z.string().uuid(),
  productId: z.string().uuid(),
  status: z.enum(["active", "hidden"]),
});

export async function setProductStatus(formData: FormData): Promise<Result<null>> {
  const parsed = productStatusSchema.safeParse({
    shopId: formData.get("shopId"),
    productId: formData.get("productId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return err("Invalid request.", "invalid_input");
  await requireShopRole(parsed.data.shopId, "manager");

  await db
    .update(schema.products)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(
      and(
        eq(schema.products.id, parsed.data.productId),
        eq(schema.products.shopId, parsed.data.shopId),
      ),
    );
  revalidateShop(parsed.data.shopId);
  return ok(null);
}

const deleteProductSchema = z.object({
  shopId: z.string().uuid(),
  productId: z.string().uuid(),
});

export async function deleteProduct(formData: FormData): Promise<Result<null>> {
  const parsed = deleteProductSchema.safeParse({
    shopId: formData.get("shopId"),
    productId: formData.get("productId"),
  });
  if (!parsed.success) return err("Invalid request.", "invalid_input");
  await requireShopRole(parsed.data.shopId, "manager");

  await db
    .delete(schema.products)
    .where(
      and(
        eq(schema.products.id, parsed.data.productId),
        eq(schema.products.shopId, parsed.data.shopId),
      ),
    );
  revalidateShop(parsed.data.shopId);
  return ok(null);
}

// Void-returning wrappers for direct <form action={…}> usage (progressive
// enhancement). The Result is intentionally ignored here — server-side
// validation guards bad input; the page re-renders via revalidatePath.
export async function createCollectionAction(formData: FormData): Promise<void> {
  await createCollection(formData);
}
export async function setCollectionStatusAction(formData: FormData): Promise<void> {
  await setCollectionStatus(formData);
}
export async function setProductStatusAction(formData: FormData): Promise<void> {
  await setProductStatus(formData);
}
export async function deleteProductAction(formData: FormData): Promise<void> {
  await deleteProduct(formData);
}

const createProductSchema = z.object({
  shopId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  buyUrl: z.string().trim().url().max(2048),
  altText: z.string().trim().min(1).max(300),
  priceCents: z.coerce.number().int().min(0).optional(),
  currency: z.string().trim().length(3).optional(),
  imageUrl: z.string().trim().url().max(2048).optional(),
  collectionId: z.string().uuid().optional(),
});

// Manual single-product add (for merchants without a CSV or store connection).
export async function createProduct(formData: FormData): Promise<Result<{ id: string }>> {
  const str = (k: string): string | undefined => {
    const v = formData.get(k);
    return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
  };
  const parsed = createProductSchema.safeParse({
    shopId: str("shopId"),
    name: str("name"),
    buyUrl: str("buyUrl"),
    altText: str("altText"),
    priceCents: str("priceCents"),
    currency: str("currency"),
    imageUrl: str("imageUrl"),
    collectionId: str("collectionId"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return err(`${first.path.join(".") || "input"}: ${first.message}`, "invalid_input");
  }
  const d = parsed.data;
  await requireShopRole(d.shopId, "manager");

  if (d.collectionId) {
    const [c] = await db
      .select({ id: schema.collections.id })
      .from(schema.collections)
      .where(and(eq(schema.collections.id, d.collectionId), eq(schema.collections.shopId, d.shopId)))
      .limit(1);
    if (!c) return err("Collection not found.", "invalid_collection");
  }

  const localKey = `${slugify(d.name)}-${crypto.randomUUID().slice(0, 6)}`;
  const [row] = await db
    .insert(schema.products)
    .values({
      shopId: d.shopId,
      collectionId: d.collectionId ?? null,
      localKey,
      name: d.name,
      buyUrl: d.buyUrl,
      priceCents: d.priceCents ?? null,
      currency: d.currency ? d.currency.toUpperCase() : d.priceCents != null ? "USD" : null,
      imageUrl: d.imageUrl ?? null,
      altText: d.altText,
      source: "manual",
      sortOrder: 0,
    })
    .returning({ id: schema.products.id });
  if (!row) return err("Failed to add product.", "db_error");

  revalidateShop(d.shopId);
  return ok({ id: row.id });
}
