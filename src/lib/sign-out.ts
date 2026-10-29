/**
 * Sign-out semantics (BAM, 2026-10-29, witus task 128 option (b)).
 *
 * - "Sign out" ends ONLY this app's session and goes to /sign-in. It never navigates to the IdP,
 *   so other WitUS apps and the WitUS session itself stay signed in.
 * - "Sign out of WitUS everywhere" is a second control. It ends this app's session, then sends the
 *   browser to the IdP's RP-initiated logout endpoint, which ends the WitUS session. Other WitUS
 *   apps keep their own sessions until you sign out of them (the IdP has no back-channel logout).
 *
 * This replaces the 2026-08-30 behaviour where the plain button also ended the WitUS session.
 *
 * Pure helpers only (no window, no React) so tests can drive them with fakes.
 */

export const SIGN_OUT_LABEL = "Sign out";
export const SIGN_OUT_EVERYWHERE_LABEL = "Sign out of WitUS everywhere";
export const SIGN_OUT_EVERYWHERE_HELP =
  "Also signs you out of WitUS. Other WitUS apps you are signed in to stay signed in until you sign out of them.";
export const SIGN_OUT_PENDING_LABEL = "Signing out…";

/** Where plain "Sign out" lands. */
export const LOCAL_SIGN_OUT_DESTINATION = "/sign-in";

/**
 * The IdP logout URL for "Sign out of WitUS everywhere".
 *
 * `endSessionUrl` is `witusEndSessionEndpoint` from src/lib/env.ts: the IdP's endsession endpoint
 * with `?client_id=…` already baked in on the server. `&`, not `?`, for that reason.
 *
 * Trailing slash is REQUIRED. better-auth exact-matches post_logout_redirect_uri against the
 * client's registered redirectUrls, and the IdP registry (gemini/witus lib/identity/clients.ts)
 * registers this app as `shop` with postLogoutPath "/" → `https://shop.witus.online/`. Drop the
 * slash and the IdP returns invalid_request.
 */
export function endSessionNavigationUrl(endSessionUrl: string, origin: string): string {
  return `${endSessionUrl}&post_logout_redirect_uri=${encodeURIComponent(`${origin}/`)}`;
}

/** Plain "Sign out": this app only. Deliberately has no IdP URL to navigate to. */
export async function signOutHere(deps: {
  signOut: () => Promise<unknown>;
  goLocal: (path: string) => void;
}): Promise<void> {
  try {
    await deps.signOut();
  } catch {
    // Still send them to the sign-in page; a failed sign-out call must not strand them.
  }
  deps.goLocal(LOCAL_SIGN_OUT_DESTINATION);
}

/** "Sign out of WitUS everywhere": this app's session first, then the IdP. */
export async function signOutEverywhere(deps: {
  signOut: () => Promise<unknown>;
  navigate: (url: string) => void;
  endSessionUrl: string;
  origin: string;
}): Promise<void> {
  // ORDER IS THE SAFETY PROPERTY. The local session is destroyed before we hand off, so if the IdP
  // refuses the logout, is unreachable, or the redirect never completes, the person is still
  // signed out HERE. Never hand off first and destroy locally afterwards: that turns any IdP
  // failure into "I clicked sign out and I am still signed in".
  try {
    await deps.signOut();
  } catch {
    // Swallowed: the IdP hand-off below still ends the WitUS session.
  }
  // A full navigation, not router.push: this leaves our origin for the IdP, which then returns to
  // `<origin>/`.
  deps.navigate(endSessionNavigationUrl(deps.endSessionUrl, deps.origin));
}
