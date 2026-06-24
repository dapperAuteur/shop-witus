import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import type { Collection, Product, Shop } from "./catalog";

export interface EmbedData {
  shop: Shop;
  collection: Collection;
  products: Product[];
}

// Public, embed-safe read: only a PUBLISHED collection and its ACTIVE products,
// no user/PII fields. Returns null (→ 404) for anything not publicly shoppable.
export async function getEmbedCollection(
  shopSlug: string,
  collectionSlug: string,
): Promise<EmbedData | null> {
  const [shop] = await db
    .select()
    .from(schema.shops)
    .where(eq(schema.shops.slug, shopSlug))
    .limit(1);
  if (!shop) return null;

  const [collection] = await db
    .select()
    .from(schema.collections)
    .where(
      and(
        eq(schema.collections.shopId, shop.id),
        eq(schema.collections.slug, collectionSlug),
        eq(schema.collections.status, "published"),
      ),
    )
    .limit(1);
  if (!collection) return null;

  const products = await db
    .select()
    .from(schema.products)
    .where(
      and(
        eq(schema.products.shopId, shop.id),
        eq(schema.products.collectionId, collection.id),
        eq(schema.products.status, "active"),
      ),
    )
    .orderBy(asc(schema.products.sortOrder), asc(schema.products.createdAt));

  return { shop, collection, products };
}

export async function listPublishedCollections(shopId: string): Promise<Collection[]> {
  return db
    .select()
    .from(schema.collections)
    .where(and(eq(schema.collections.shopId, shopId), eq(schema.collections.status, "published")))
    .orderBy(asc(schema.collections.sortOrder), asc(schema.collections.name));
}
