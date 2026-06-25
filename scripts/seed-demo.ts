import { neonConfig, Pool } from "@neondatabase/serverless";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "../src/db/schema";
import { slugify } from "../src/lib/slug";

// Seeds a public demo shop so the embeddable widget can be verified end-to-end:
//   /embed/shop/demo-shop/best-sellers
// Idempotent — safe to re-run. Run: pnpm db:seed

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;
if (!connectionString || connectionString.includes("placeholder")) {
  console.error("DATABASE_URL is not set. Put a real Neon string in .env.local.");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const db = drizzle(pool, { schema, casing: "snake_case" });

const SHOP_SLUG = "demo-shop";
const COLLECTION_SLUG = "best-sellers";

const PRODUCTS = [
  {
    name: "Hand-thrown Ceramic Mug",
    buyUrl: "https://example.com/products/mug",
    priceCents: 2499,
    imageUrl: "https://picsum.photos/seed/shopwitus-mug/500/500",
    altText: "Speckled white hand-thrown ceramic mug",
  },
  {
    name: "Trail Map Poster",
    buyUrl: "https://example.com/products/poster",
    priceCents: 1800,
    imageUrl: "https://picsum.photos/seed/shopwitus-poster/500/500",
    altText: "Framed vintage trail map art print",
  },
  {
    name: "Organic Cotton Tote",
    buyUrl: "https://example.com/products/tote",
    priceCents: 1500,
    imageUrl: "https://picsum.photos/seed/shopwitus-tote/500/500",
    altText: "Natural organic cotton tote bag",
  },
];

async function main() {
  let [shop] = await db
    .select()
    .from(schema.shops)
    .where(eq(schema.shops.slug, SHOP_SLUG))
    .limit(1);
  if (!shop) {
    [shop] = await db
      .insert(schema.shops)
      .values({ slug: SHOP_SLUG, name: "Demo Shop" })
      .returning();
  }
  if (!shop) throw new Error("Failed to create demo shop");

  let [collection] = await db
    .select()
    .from(schema.collections)
    .where(and(eq(schema.collections.shopId, shop.id), eq(schema.collections.slug, COLLECTION_SLUG)))
    .limit(1);
  if (!collection) {
    [collection] = await db
      .insert(schema.collections)
      .values({ shopId: shop.id, slug: COLLECTION_SLUG, name: "Best Sellers", status: "published" })
      .returning();
  } else if (collection.status !== "published") {
    await db
      .update(schema.collections)
      .set({ status: "published" })
      .where(eq(schema.collections.id, collection.id));
  }
  if (!collection) throw new Error("Failed to create demo collection");

  for (const [i, p] of PRODUCTS.entries()) {
    const localKey = slugify(p.name);
    await db
      .insert(schema.products)
      .values({
        shopId: shop.id,
        collectionId: collection.id,
        localKey,
        name: p.name,
        buyUrl: p.buyUrl,
        priceCents: p.priceCents,
        currency: "USD",
        imageUrl: p.imageUrl,
        altText: p.altText,
        source: "manual",
        sortOrder: (i + 1) * 10,
      })
      .onConflictDoUpdate({
        target: [schema.products.shopId, schema.products.localKey],
        set: {
          collectionId: collection.id,
          name: p.name,
          buyUrl: p.buyUrl,
          priceCents: p.priceCents,
          currency: "USD",
          imageUrl: p.imageUrl,
          altText: p.altText,
          status: "active",
          updatedAt: new Date(),
        },
      });
  }

  console.log(
    `Seeded shop /${SHOP_SLUG} → published collection /${COLLECTION_SLUG} with ${PRODUCTS.length} products.`,
  );
  console.log(`Widget: /embed/shop/${SHOP_SLUG}/${COLLECTION_SLUG}`);
  await pool.end();
}

main().catch((error) => {
  console.error("Seed failed:", error);
  pool.end().finally(() => process.exit(1));
});
