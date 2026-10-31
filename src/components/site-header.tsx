import Link from "next/link";
import { SignOutButton } from "@/app/dashboard/sign-out-button";

/**
 * Header for Shop.WitUS's own public pages: home, Help & FAQ, and sign-in.
 *
 * Sign-in control rule (witus docs/shared-ui-ux-dx.md, "Sign-in control"): a signed-out visitor
 * always sees a link named exactly "Sign in" that goes to this app's own /sign-in. It is a plain
 * link: no WitUS IdP request, no WitUS button (the sign-in page offers WitUS itself). Signed in,
 * the slot becomes "Dashboard" plus "Sign out", which ends ONLY this app's session (witus task 128
 * option (b)); "Sign out of WitUS everywhere" lives on the dashboard, where its help text fits.
 * Until 2026-10-31 the only way in from the home page was the "Get started" button.
 *
 * Not rendered on a merchant's storefront (/s/[shopSlug]) or inside the embed iframe
 * (/embed/...): shoppers there are the merchant's customers, not Shop.WitUS users.
 *
 * `signedIn` is resolved on the server by the page; when the session lookup fails the page passes
 * false, so the control falls back to "Sign in" rather than disappearing.
 *
 * 320px: the brand and the auth controls fit on one line; Help hides below sm (the footer and the
 * home page both link to it), and the nav wraps rather than ever scrolling sideways.
 */
const LINK_CLASS =
  "min-h-11 items-center rounded-md px-2 text-sm font-medium text-zinc-600 sm:px-3 underline-offset-4 hover:bg-black/5 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:text-zinc-300 dark:hover:bg-white/5";

export const HEADER_SIGN_IN_LABEL = "Sign in";

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="border-b border-black/10 dark:border-white/15">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-1">
        <Link
          href="/"
          className="inline-flex min-h-11 shrink-0 items-center rounded-md font-mono text-sm font-bold uppercase tracking-wide text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:text-emerald-400"
        >
          Shop.WitUS
        </Link>
        <nav aria-label="Primary" className="flex min-w-0 flex-wrap items-center justify-end gap-1 sm:gap-2">
          <Link href="/help" className={`${LINK_CLASS} hidden sm:inline-flex`}>
            Help
          </Link>
          {signedIn ? (
            <>
              <Link href="/dashboard" className={`${LINK_CLASS} inline-flex`}>
                Dashboard
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/sign-in"
              className="inline-flex min-h-11 items-center rounded-md border border-black/15 px-4 text-sm font-semibold hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:border-white/20 dark:hover:bg-white/5"
            >
              {HEADER_SIGN_IN_LABEL}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
