import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db/client";

export type Shop = typeof schema.shops.$inferSelect;
export type Collection = typeof schema.collections.$inferSelect;
export type Product = typeof schema.products.$inferSelect;

export async function getShop(shopId: string): Promise<Shop | null> {
  const [row] = await db.select().from(schema.shops).where(eq(schema.shops.id, shopId)).limit(1);
  return row ?? null;
}

export async function getShopBySlug(slug: string): Promise<Shop | null> {
  const [row] = await db.select().from(schema.shops).where(eq(schema.shops.slug, slug)).limit(1);
  return row ?? null;
}

export async function listCollections(shopId: string): Promise<Collection[]> {
  return db
    .select()
    .from(schema.collections)
    .where(eq(schema.collections.shopId, shopId))
    .orderBy(asc(schema.collections.sortOrder), asc(schema.collections.name));
}

export async function listProducts(shopId: string): Promise<Product[]> {
  return db
    .select()
    .from(schema.products)
    .where(eq(schema.products.shopId, shopId))
    .orderBy(asc(schema.products.sortOrder), asc(schema.products.createdAt));
}
