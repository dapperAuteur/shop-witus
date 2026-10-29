"use client";

import { useId, useTransition } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  SIGN_OUT_EVERYWHERE_HELP,
  SIGN_OUT_EVERYWHERE_LABEL,
  SIGN_OUT_LABEL,
  SIGN_OUT_PENDING_LABEL,
  signOutEverywhere,
  signOutHere,
} from "@/lib/sign-out";

const BUTTON_BASE =
  "inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-60";

/**
 * "Sign out": ends ONLY this app's session, then /sign-in (BAM, 2026-10-29, witus task 128
 * option (b)). It never navigates to the IdP, so the WitUS session and other WitUS apps stay
 * signed in. Its label is always "Sign out" (shared UI rule: the header sign-in/out control is
 * never renamed). Ending the WitUS session is `SignOutEverywhereButton`'s job.
 */
export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await signOutHere({
            signOut: () => authClient.signOut(),
            goLocal: (path) => {
              router.push(path);
              router.refresh();
            },
          });
        })
      }
      className={`${BUTTON_BASE} border border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5`}
    >
      {pending ? SIGN_OUT_PENDING_LABEL : SIGN_OUT_LABEL}
    </button>
  );
}

/**
 * "Sign out of WitUS everywhere": ends this app's session, THEN ends the WitUS session at
 * accounts.witus.online (order in `signOutEverywhere`, src/lib/sign-out.ts). Other WitUS apps keep
 * their own sessions until you sign out of them; the help text says so.
 *
 * The caller resolves `endSessionUrl` on the SERVER (`witusEndSessionEndpoint` in src/lib/env.ts)
 * and passes null when this app is not a configured ecosystem OIDC client; then nothing renders.
 */
export function SignOutEverywhereButton({ endSessionUrl }: { endSessionUrl: string | null }) {
  const helpId = useId();
  const [pending, startTransition] = useTransition();
  if (!endSessionUrl) return null;
  return (
    <div className="flex max-w-xs flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        aria-describedby={helpId}
        onClick={() =>
          startTransition(async () => {
            await signOutEverywhere({
              signOut: () => authClient.signOut(),
              navigate: (url) => window.location.assign(url),
              endSessionUrl,
              origin: window.location.origin,
            });
          })
        }
        className={`${BUTTON_BASE} text-zinc-600 underline-offset-4 hover:bg-black/5 hover:underline dark:text-zinc-300 dark:hover:bg-white/5`}
      >
        {pending ? SIGN_OUT_PENDING_LABEL : SIGN_OUT_EVERYWHERE_LABEL}
      </button>
      <p id={helpId} className="text-right text-xs text-zinc-600 dark:text-zinc-300">
        {SIGN_OUT_EVERYWHERE_HELP}
      </p>
    </div>
  );
}
