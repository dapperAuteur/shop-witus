import { eq } from "drizzle-orm";
import { db, schema } from "@/db/client";

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "shop"
  );
}

function shortId(length = 6): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, length);
}

// Self-service: the first time a user is created (their first magic-link
// sign-in), give them a shop with themselves as Owner. No operator approval,
// no per-merchant setup. Idempotent — a user who already owns/belongs to a
// shop is left alone.
export async function createShopForNewUser(userId: string, email: string): Promise<void> {
  const existing = await db
    .select({ shopId: schema.shopUserRoles.shopId })
    .from(schema.shopUserRoles)
    .where(eq(schema.shopUserRoles.userId, userId))
    .limit(1);
  if (existing.length > 0) return;

  const base = slugify(email.split("@")[0] ?? "shop");
  const slug = `${base}-${shortId()}`;

  const [shop] = await db
    .insert(schema.shops)
    .values({ slug, name: "My Shop" })
    .returning({ id: schema.shops.id });
  if (!shop) return;

  await db
    .insert(schema.shopUserRoles)
    .values({ shopId: shop.id, userId, role: "owner" });
}
