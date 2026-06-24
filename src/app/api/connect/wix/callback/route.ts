import { sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/db/client";
import { decryptSecret } from "@/lib/crypto";
import { env } from "@/lib/env";
import { getSession, getUserShopRole } from "@/lib/rbac";

function back(shopId: string | null, reason: string) {
  const path = shopId ? `/dashboard/${shopId}?wix=${reason}` : `/dashboard?wix=${reason}`;
  return NextResponse.redirect(new URL(path, env.APP_URL));
}

// Wix redirects here after install with an instanceId + our state. We verify
// the signed state cookie (CSRF + ties the callback to the initiating shop),
// re-check the user manages the shop, and store the instance id. Access tokens
// are minted on demand from the app secret + instance id (see src/lib/wix.ts).
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const instanceId = params.get("instanceId") ?? "";
  const state = params.get("state") ?? "";
  const cookie = req.cookies.get("wix_connect")?.value;
  if (!cookie) return back(null, "expired");

  let shopId: string | undefined;
  let nonce: string | undefined;
  try {
    const parts = decryptSecret(cookie).split(".");
    shopId = parts[0];
    nonce = parts[1];
  } catch {
    return back(null, "invalid");
  }
  if (!shopId || !nonce) return back(null, "invalid");
  if (!state || state !== nonce) return back(shopId, "state_mismatch");
  if (!instanceId) return back(shopId, "no_instance");

  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/sign-in", env.APP_URL));
  const role = await getUserShopRole(session.user.id, shopId);
  if (role !== "owner" && role !== "manager") return back(shopId, "forbidden");

  await db
    .insert(schema.storeConnections)
    .values({ shopId, platform: "wix", status: "connected", externalAccountId: instanceId })
    .onConflictDoUpdate({
      target: [schema.storeConnections.shopId, schema.storeConnections.platform],
      set: { status: "connected", externalAccountId: instanceId, updatedAt: sql`now()` },
    });

  const res = back(shopId, "connected");
  res.cookies.delete("wix_connect");
  return res;
}
