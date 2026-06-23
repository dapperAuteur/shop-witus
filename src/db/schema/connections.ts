import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { shops } from "./shops";

export const connectionPlatform = pgEnum("connection_platform", ["wix", "square", "shopify"]);
export const connectionStatus = pgEnum("connection_status", ["connected", "revoked"]);

// A merchant's OAuth link to an external storefront (Wix is the MVP target;
// Square/Shopify are fast-follow). Tokens are encrypted at rest with
// STORE_TOKEN_ENC_KEY before they are written here.
export const storeConnections = pgTable(
  "store_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    platform: connectionPlatform("platform").notNull(),
    status: connectionStatus("status").notNull().default("connected"),
    accessTokenEnc: text("access_token_enc"),
    refreshTokenEnc: text("refresh_token_enc"),
    scope: text("scope"),
    externalAccountId: text("external_account_id"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("store_connections_shop_platform_unique").on(t.shopId, t.platform),
    index("store_connections_shop_idx").on(t.shopId),
  ],
);
