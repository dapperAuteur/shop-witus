"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

/**
 * GLOBAL SIGN-OUT (BAM's decision, 2026-08-30: "signout signs out of every app"). When
 * `endSessionUrl` is present, signing out here also ends the shared session at
 * accounts.witus.online, so it signs you out of every WitUS app in this browser. The caller
 * resolves the URL on the SERVER (see `witusEndSessionEndpoint` in src/lib/env.ts) and passes null
 * when this app is not a configured ecosystem OIDC client, in which case sign-out stays exactly as
 * local as it has always been.
 */
export function SignOutButton({ endSessionUrl = null }: { endSessionUrl?: string | null } = {}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await authClient.signOut();
          // ORDER IS THE SAFETY PROPERTY. The local session is already destroyed by the line above,
          // so if the IdP refuses the logout, is unreachable, or the redirect never completes, the
          // person is still signed out HERE. Never hand off first and destroy locally afterwards:
          // that turns any IdP failure into "I clicked sign out and I am still signed in".
          if (endSessionUrl) {
            // Trailing slash is REQUIRED. better-auth exact-matches post_logout_redirect_uri
            // against the client's registered redirectUrls, and the IdP registry
            // (gemini/witus lib/identity/clients.ts) registers this app as `shop` with
            // postLogoutPath "/" → `https://shop.witus.online/`. Drop the slash and the IdP
            // returns invalid_request.
            const back = `${window.location.origin}/`;
            // A full navigation, not router.push: this leaves our origin for the IdP, which then
            // returns to `back`. `&`, not `?`: endSessionUrl already carries client_id, which
            // better-auth requires alongside post_logout_redirect_uri (see src/lib/env.ts).
            window.location.assign(
              `${endSessionUrl}&post_logout_redirect_uri=${encodeURIComponent(back)}`,
            );
            return;
          }
          router.push("/sign-in");
          router.refresh();
        })
      }
      className="inline-flex min-h-11 items-center justify-center rounded-md border border-black/15 px-4 text-sm font-medium hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-60 dark:border-white/20 dark:hover:bg-white/5"
    >
      {pending ? "Signing out…" : endSessionUrl ? "Sign out of WitUS" : "Sign out"}
    </button>
  );
}
