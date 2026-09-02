/**
 * "Continue as <name>" — the silent ecosystem-SSO check, plus the global sign-out URL.
 *
 * THE PROBLEM. Signing in on shop.witus.online sends you to the WitUS login page even when another
 * tab already has you signed in to a WitUS app. BAM chose OPTION B on 2026-08-30: render the
 * sign-in form immediately, ask the IdP who this is IN PARALLEL, and swap the existing "Sign in
 * with WitUS" button's label to "Continue as <name>" once the answer arrives. Deliberately NOT an
 * automatic redirect — that is what keeps the latency off the common case (most people hitting a
 * sign-in page are signed in nowhere) and keeps a redirect loop mostly impossible.
 *
 * WHY A CROSS-ORIGIN PROBE AND NOT OIDC `prompt=none`. `prompt=none` is a NAVIGATION: you leave
 * the sign-in page to ask, which is the automatic design BAM rejected, and the only way to ask
 * without leaving is a hidden iframe, which Safari ITP already blocks. So we ask a purpose-built
 * IdP endpoint over CORS instead, in parallel with a form that has already rendered.
 *
 * WHAT THIS BUYS AND WHAT IT DOES NOT. The probe carries the IdP's cookie as a THIRD-PARTY cookie
 * from here, so it answers on Chrome/Edge and returns nothing under Safari ITP or Firefox Total
 * Cookie Protection. That is the design, not a bug: a probe that answers nothing renders nothing
 * and the visitor keeps the exact sign-in page they already had. A failed check is invisible.
 *
 * THE IDENTITY THIS RETURNS IS DISPLAY ONLY. It arrives from a cross-origin response, so it is
 * client-supplied by definition and MUST NEVER authenticate anyone. Clicking "Continue as <name>"
 * runs the real OIDC code flow (better-auth genericOAuth, providerId "witus"), which is where
 * identity is actually established. Nothing in this file may ever be used to grant access.
 *
 * Pure helpers only: no `server-only`, no next/headers, no window access at module scope — the
 * tests import them directly and both the server (env.ts) and the client button use them.
 */

/** Query param that marks "this browser already tried the ecosystem flow on this page". */
export const SSO_ATTEMPT_PARAM = "sso";
export const SSO_ATTEMPT_VALUE = "tried";

/**
 * sessionStorage key for the same marker. Written IMMEDIATELY BEFORE we send the browser to the
 * IdP, never after we come back: a marker written on return is a marker that never exists when the
 * return is the thing that failed.
 */
export const SSO_ATTEMPT_STORAGE_KEY = "witus.sso.attempted";

/** How long to wait for the probe before giving up. A silent check that hangs is a broken page. */
export const SILENT_SSO_TIMEOUT_MS = 4000;

/**
 * The discovery document this app points at when WITUS_OIDC_DISCOVERY_URL is unset. Declared once,
 * here, and imported by both auth.ts (the OIDC provider) and env.ts (the derived endpoints), so
 * accounts.witus.online is asserted in exactly ONE place. Everything else derives from it.
 */
export const WITUS_OIDC_DISCOVERY_FALLBACK =
  "https://accounts.witus.online/api/idp/.well-known/openid-configuration";

/** Longest display name we will render. Caps a hostile or absurd value from blowing up the button. */
const MAX_LABEL_LENGTH = 48;

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

/** Identity shown on the button. Display only, never a credential. */
export interface SsoIdentity {
  /** What "Continue as ___" says. Already trimmed, de-controlled, and length-capped. */
  label: string;
}

export type SilentSsoSkip = "not-configured" | "already-attempted" | "already-signed-in";

export type SilentSsoDecision = { attempt: true } | { attempt: false; skip: SilentSsoSkip };

/**
 * Should this browser ask the IdP who it is?
 *
 * `endpoint` is resolved on the SERVER (see `witusSilentSsoEndpoint` in env.ts) and is null unless
 * WITUS_OIDC_CLIENT_ID is set — an affordance the visitor cannot complete is worse than none.
 *
 * NOTE ON THE HOST GATE. witus-learn additionally gates this on "is the request host the
 * WitUS-branded one", because a white-label school must never touch accounts.witus.online. That
 * gate does not apply here: Shop.WitUS is multi-tenant by PATH (`/s/<shopSlug>`), all on the single
 * WitUS-branded host shop.witus.online. There is no customer-branded host and no custom-domain
 * support anywhere in this repo, so there is no surface that could leak. If per-merchant custom
 * domains ever ship, this decision needs a server-resolved host gate added FIRST.
 */
export function silentSsoDecision(input: {
  endpoint: string | null | undefined;
  search?: string | null;
  attempted?: boolean;
  signedIn?: boolean;
}): SilentSsoDecision {
  if (!input.endpoint) return { attempt: false, skip: "not-configured" };
  if (input.signedIn) return { attempt: false, skip: "already-signed-in" };
  if (input.attempted || hasAttemptMarker(input.search)) {
    return { attempt: false, skip: "already-attempted" };
  }
  return { attempt: true };
}

/** Does this query string carry the one-shot marker? Accepts "?a=b" or "a=b". */
export function hasAttemptMarker(search: string | null | undefined): boolean {
  if (typeof search !== "string" || search === "") return false;
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return params.get(SSO_ATTEMPT_PARAM) === SSO_ATTEMPT_VALUE;
}

/** Add the one-shot marker to a same-origin path, preserving any query and hash it already has. */
export function withAttemptMarker(path: string): string {
  const [beforeHash, ...hashRest] = path.split("#");
  const hash = hashRest.length > 0 ? `#${hashRest.join("#")}` : "";
  const [pathname, ...queryRest] = beforeHash.split("?");
  const params = new URLSearchParams(queryRest.join("?"));
  params.set(SSO_ATTEMPT_PARAM, SSO_ATTEMPT_VALUE);
  return `${pathname}?${params.toString()}${hash}`;
}

/**
 * Split a discovery URL into the IdP's origin and its better-auth basePath.
 *
 *   https://accounts.witus.online/api/idp/.well-known/openid-configuration
 *     → { origin: "https://accounts.witus.online", basePath: "/api/idp" }
 *
 * Everything below derives from this rather than hardcoding the IdP host a second time, so the one
 * external value this app asserts stays the discovery URL it is already configured with
 * (authoritative-values rule).
 */
function splitDiscoveryUrl(
  discoveryUrl: string | null | undefined,
): { origin: string; basePath: string } | null {
  if (!discoveryUrl) return null;
  let parsed: URL;
  try {
    parsed = new URL(discoveryUrl);
  } catch {
    return null;
  }
  const cut = parsed.pathname.indexOf("/.well-known/");
  if (cut < 0) return null;
  return { origin: parsed.origin, basePath: parsed.pathname.slice(0, cut) };
}

/**
 * The IdP's RP-initiated logout endpoint: `<basePath>/oauth2/endsession` — the `end_session_endpoint`
 * the live discovery document advertises.
 *
 * BAM chose GLOBAL sign-out on 2026-08-30: "signout signs out of every app". Ending only this app's
 * session leaves the IdP session alive, and once "Continue as …" is live that means signing out and
 * coming back offers to sign you straight back in, which reads as a broken logout.
 */
export function endSessionEndpointFromDiscovery(
  discoveryUrl: string | null | undefined,
): string | null {
  const parts = splitDiscoveryUrl(discoveryUrl);
  if (!parts) return null;
  return `${parts.origin}${parts.basePath}/oauth2/endsession`;
}

/**
 * The ecosystem session probe: `<idp-origin>/api/ecosystem/session`.
 *
 * NOT the IdP's better-auth `<basePath>/get-session`, which cannot be used and must not be opened
 * up: it returns the full `{ session, user }` and `session` carries the SESSION TOKEN, so
 * credentialed CORS on it would let any ecosystem origin — or an XSS on any one of them — lift a
 * live IdP session token. `/api/ecosystem/session` is the purpose-built endpoint in gemini/witus
 * (`app/api/ecosystem/session/route.ts`): same cookie, but it answers with a display label and
 * nothing else, and its allow-origin list is derived from the IdP's own client registry (which
 * registers this app as `shop` → https://shop.witus.online). Response shape:
 * `{ signedIn: true, user: { name } }` or `{ signedIn: false }`.
 */
export function silentSsoEndpointFromDiscovery(
  discoveryUrl: string | null | undefined,
): string | null {
  const parts = splitDiscoveryUrl(discoveryUrl);
  if (!parts) return null;
  return `${parts.origin}/api/ecosystem/session`;
}

/**
 * Read a display name out of the probe response. `{ signedIn: false }` and anything unexpected
 * yield null, which renders nothing. Handles a `{ user: {...} }` envelope and a bare user object.
 */
export function parseSilentSsoIdentity(payload: unknown): SsoIdentity | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  if (root.signedIn === false) return null;
  const candidate =
    root.user && typeof root.user === "object" ? (root.user as Record<string, unknown>) : root;
  const label = cleanLabel(candidate.name) ?? cleanLabel(candidate.email);
  return label ? { label } : null;
}

function cleanLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(CONTROL_CHARS, "").trim();
  if (!cleaned) return null;
  return cleaned.length > MAX_LABEL_LENGTH
    ? `${cleaned.slice(0, MAX_LABEL_LENGTH - 1).trimEnd()}…`
    : cleaned;
}

/** Button copy. Kept here so the test pins the exact string the visitor reads. */
export function continueAsLabel(identity: SsoIdentity | null): string {
  return identity ? `Continue as ${identity.label}` : "Sign in with WitUS";
}
