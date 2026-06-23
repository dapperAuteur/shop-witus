import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { db, schema } from "@/db/client";
import { auth, type Session } from "./auth";

export type ShopRole = "owner" | "manager" | "staff";

// Rank set in code (not enum order). Owner ⊇ manager ⊇ staff.
const RANK: Record<ShopRole, number> = { staff: 0, manager: 1, owner: 2 };

export async function getSession(): Promise<Session | null> {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireUser(): Promise<Session["user"]> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session.user;
}

export interface ShopMembership {
  shopId: string;
  slug: string;
  name: string;
  role: ShopRole;
}

// Every shop the user has any role in (with the highest role per shop).
export async function listUserShops(userId: string): Promise<ShopMembership[]> {
  const rows = await db
    .select({
      shopId: schema.shops.id,
      slug: schema.shops.slug,
      name: schema.shops.name,
      role: schema.shopUserRoles.role,
    })
    .from(schema.shopUserRoles)
    .innerJoin(schema.shops, eq(schema.shops.id, schema.shopUserRoles.shopId))
    .where(eq(schema.shopUserRoles.userId, userId));

  const best = new Map<string, ShopMembership>();
  for (const r of rows) {
    const role = r.role as ShopRole;
    const current = best.get(r.shopId);
    if (!current || RANK[role] > RANK[current.role]) {
      best.set(r.shopId, { shopId: r.shopId, slug: r.slug, name: r.name, role });
    }
  }
  return [...best.values()];
}

export async function getUserShopRole(userId: string, shopId: string): Promise<ShopRole | null> {
  const rows = await db
    .select({ role: schema.shopUserRoles.role })
    .from(schema.shopUserRoles)
    .where(and(eq(schema.shopUserRoles.userId, userId), eq(schema.shopUserRoles.shopId, shopId)));
  let best: ShopRole | null = null;
  for (const r of rows) {
    const role = r.role as ShopRole;
    if (!best || RANK[role] > RANK[best]) best = role;
  }
  return best;
}

// Guard for shop-scoped routes/actions. Throws a 403 (forbidden()) when the
// signed-in user lacks at least `min` in this shop. Returns the user + role.
export async function requireShopRole(
  shopId: string,
  min: ShopRole = "staff",
): Promise<{ user: Session["user"]; role: ShopRole }> {
  const user = await requireUser();
  const role = await getUserShopRole(user.id, shopId);
  if (!role || RANK[role] < RANK[min]) forbidden();
  return { user, role };
}
