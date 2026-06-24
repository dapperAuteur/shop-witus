import { NextResponse, type NextRequest } from "next/server";
import { encryptSecret } from "@/lib/crypto";
import { env, hasWix } from "@/lib/env";
import { getSession, getUserShopRole } from "@/lib/rbac";

// Begins the Wix "Connect your store" flow: verifies the signed-in user can
// manage the shop, stashes a signed state cookie, and redirects to the Wix
// app install/authorize URL. Wix returns to /api/connect/wix/callback.
export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shopId") ?? "";
  if (!shopId) return NextResponse.json({ error: "Missing shopId" }, { status: 400 });

  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/sign-in", env.APP_URL));
  const role = await getUserShopRole(session.user.id, shopId);
  if (role !== "owner" && role !== "manager") {
    return NextResponse.redirect(new URL(`/dashboard/${shopId}?wix=forbidden`, env.APP_URL));
  }
  if (!hasWix || !env.STORE_TOKEN_ENC_KEY) {
    return NextResponse.redirect(new URL(`/dashboard/${shopId}?wix=unconfigured`, env.APP_URL));
  }

  const nonce = crypto.randomUUID();
  const stateCookie = encryptSecret(`${shopId}.${nonce}`);
  const redirectUri = env.WIX_REDIRECT_URI ?? `${env.APP_URL}/api/connect/wix/callback`;

  // TODO(operator task 07): confirm the exact Wix install/authorize URL for
  // the registered app (from the Wix Developer Center / App Market). This is
  // the documented installer shape.
  const installUrl = new URL("https://www.wix.com/installer/install");
  installUrl.searchParams.set("appId", env.WIX_CLIENT_ID as string);
  installUrl.searchParams.set("redirectUrl", redirectUri);
  installUrl.searchParams.set("state", nonce);

  const res = NextResponse.redirect(installUrl.toString());
  res.cookies.set("wix_connect", stateCookie, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
