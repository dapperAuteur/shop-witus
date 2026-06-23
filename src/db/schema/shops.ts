import { boolean, index, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";

// Per-shop role. A user can hold a role in many shops; the minimum check on
// each route is "user has a role granting permission X in this shop".
export const shopRole = pgEnum("shop_role", ["owner", "manager", "staff"]);

export const shops = pgTable("shops", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Public, embedded in widget URLs (/embed/shop/[slug]/...). Auto-generated
  // at signup; the merchant can rename later.
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  accentColor: text("accent_color").notNull().default("#10b981"),
  hideChrome: boolean("hide_chrome").notNull().default(false),
  plan: text("plan").notNull().default("free"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shopUserRoles = pgTable(
  "shop_user_roles",
  {
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: shopRole("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.shopId, t.userId, t.role] }),
    index("shop_user_roles_user_idx").on(t.userId),
  ],
);
