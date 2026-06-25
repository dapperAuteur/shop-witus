"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db/client";
import { notifyProductsImported } from "@/lib/ecosystem-events";
import { err, ok, type Result } from "@/lib/result";
import { requireShopRole } from "@/lib/rbac";
import { slugify } from "@/lib/slug";
import { listWixProducts } from "@/lib/wix";

const shopSchema = z.object({ shopId: z.string().uuid() });

// Import (or re-sync) the merchant's Wix Stores products. Requires a
// connected Wix instance — created by the OAuth callback (see
// plans/runbooks/02-wix-connector.md; needs operator task 07).
export async function importFromWix(
  formData: FormData,
): Promise<Result<{ imported: number }>> {
  const parsed = shopSchema.safeParse({ shopId: formData.get("shopId") });
  if (!parsed.success) return err("Invalid request.", "invalid_input");
  const { shopId } = parsed.data;
  await requireShopRole(shopId, "manager");

  const [conn] = await db
    .select()
    .from(schema.storeConnections)
    .where(
      and(
        eq(schema.storeConnections.shopId, shopId),
        eq(schema.storeConnections.platform, "wix"),
      ),
    )
    .limit(1);
  if (!conn || conn.status !== "connected" || !conn.externalAccountId) {
    return err("Connect your Wix store first.", "not_connected");
  }

  let products;
  try {
    products = await listWixProducts(conn.externalAccountId, 100);
  } catch {
    return err("Couldn't reach your Wix store. Try reconnecting.", "wix_error");
  }
  if (products.length === 0) return ok({ imported: 0 });

  // Connector products are keyed by their Wix id so re-sync updates in place
  // and they never collide with CSV-imported rows.
  const byKey = new Map<string, typeof schema.products.$inferInsert>();
  for (const p of products) {
    const localKey = `wix-${slugify(p.externalId)}`;
    byKey.set(localKey, {
      shopId,
      localKey,
      name: p.name,
      buyUrl: p.buyUrl,
      priceCents: p.priceCents,
      currency: p.currency ?? (p.priceCents != null ? "USD" : null),
      imageUrl: p.imageUrl,
      altText: p.altText,
      source: "wix",
      externalId: p.externalId,
      sortOrder: 0,
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
        buyUrl: sql`excluded.buy_url`,
        priceCents: sql`excluded.price_cents`,
        currency: sql`excluded.currency`,
        imageUrl: sql`excluded.image_url`,
        altText: sql`excluded.alt_text`,
        source: sql`excluded.source`,
        externalId: sql`excluded.external_id`,
        updatedAt: sql`now()`,
      },
    });

  await db
    .update(schema.storeConnections)
    .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.storeConnections.id, conn.id));

  after(() => notifyProductsImported({ shopId, count: values.length, source: "wix" }));
  revalidatePath(`/dashboard/${shopId}`);
  return ok({ imported: values.length });
}

export async function disconnectWix(formData: FormData): Promise<Result<null>> {
  const parsed = shopSchema.safeParse({ shopId: formData.get("shopId") });
  if (!parsed.success) return err("Invalid request.", "invalid_input");
  await requireShopRole(parsed.data.shopId, "manager");

  await db
    .delete(schema.storeConnections)
    .where(
      and(
        eq(schema.storeConnections.shopId, parsed.data.shopId),
        eq(schema.storeConnections.platform, "wix"),
      ),
    );
  revalidatePath(`/dashboard/${parsed.data.shopId}`);
  return ok(null);
}

// Void-returning wrappers for direct <form action={…}> usage on the dashboard.
export async function importFromWixAction(formData: FormData): Promise<void> {
  await importFromWix(formData);
}
export async function disconnectWixAction(formData: FormData): Promise<void> {
  await disconnectWix(formData);
}
