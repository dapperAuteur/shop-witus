import { index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { shops } from "./shops";

export const collectionStatus = pgEnum("collection_status", ["draft", "published"]);
export const productStatus = pgEnum("product_status", ["active", "hidden"]);
// Where a product came from. Drives re-sync (connector rows carry external_id).
export const productSource = pgEnum("product_source", ["csv", "wix", "square", "shopify", "manual"]);

export const collections = pgTable(
  "collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    // Only `published` collections are exposed by the public widget.
    status: collectionStatus("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("collections_shop_slug_unique").on(t.shopId, t.slug),
    index("collections_shop_idx").on(t.shopId),
  ],
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    uploadedBy: text("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    kind: text("kind").notNull().default("image"),
    status: text("status").notNull().default("ready"),
    cloudinaryPublicId: text("cloudinary_public_id"),
    cloudinaryUrl: text("cloudinary_url"),
    width: integer("width"),
    height: integer("height"),
    bytes: integer("bytes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("media_assets_shop_idx").on(t.shopId)],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    collectionId: uuid("collection_id").references(() => collections.id, { onDelete: "set null" }),
    // Stable per-shop key for idempotent CSV/connector upsert (sku-slug or
    // name-slug). Unique within a shop.
    localKey: text("local_key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    buyUrl: text("buy_url").notNull(),
    priceCents: integer("price_cents"),
    currency: text("currency"),
    // External image URL (e.g. from the merchant's store) OR a Cloudinary
    // upload referenced by imageAssetId.
    imageUrl: text("image_url"),
    imageAssetId: uuid("image_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
    altText: text("alt_text").notNull(),
    sku: text("sku"),
    source: productSource("source").notNull().default("manual"),
    // Platform product id (Wix/Square/Shopify) for connector re-sync.
    externalId: text("external_id"),
    sortOrder: integer("sort_order").notNull().default(0),
    status: productStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("products_shop_local_key_unique").on(t.shopId, t.localKey),
    index("products_shop_idx").on(t.shopId),
    index("products_collection_idx").on(t.collectionId),
  ],
);
