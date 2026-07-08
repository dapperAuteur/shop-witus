"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

/**
 * "Sign in with WitUS" — starts the ecosystem OIDC flow against accounts.witus.online.
 * Rendered only when the SSO client is provisioned (see `hasWitusSso`); the sign-in
 * page gates it. A first-time WitUS account still runs through the user.create.after
 * hook in auth.ts, so its shop is provisioned exactly like a magic-link signup.
 */
export function WitusSsoButton() {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void authClient.signIn
          .oauth2({ providerId: "witus", callbackURL: `${window.location.origin}/dashboard` })
          .finally(() => setPending(false));
      }}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-black/15 px-6 text-base font-semibold hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-60 dark:border-white/20 dark:hover:bg-white/5"
    >
      {pending ? "Redirecting…" : "Sign in with WitUS"}
    </button>
  );
}
