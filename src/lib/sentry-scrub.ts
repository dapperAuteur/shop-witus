import type { ErrorEvent } from "@sentry/nextjs";

/**
 * Sentry `beforeSend` scrubber.
 *
 * Why this file exists: a crash report leaves the app and lands in a third-party dashboard. This
 * app handles merchant magic-link sign-in URLs, Wix OAuth callbacks (`?code=`, `?state=`), and
 * Cloudinary signing responses, so an unscrubbed event can carry a WORKING credential off-site.
 * We strip those before the event is sent, and we drop the account identity and the request
 * cookies/auth headers too.
 *
 * The bias is deliberate: redact when unsure. An over-redacted crash report costs a minute of
 * triage; an under-redacted one costs a merchant their store connection. `scrubEvent` never
 * returns null, so we keep the crash signal, just without the secrets.
 *
 * Pure and dependency-free (no `server-only`) so it can run on the client, edge, and node runtimes
 * and stay directly unit-testable.
 */

/** Query-param names that carry (or plausibly carry) a bearer secret. Matched case-insensitively
 *  as a substring, so `callbackToken`, `access_token`, `otp_code` all trip it. */
const SECRET_PARAM_RE =
  /(token|secret|code|otp|passcode|password|pwd|pin|key|jwt|sig|signature|hash|auth|credential|session|magic|invite|nonce|state)/i;

/** Path prefixes that are token-redemption endpoints by construction. Anything under these is
 *  redacted whether or not the token itself "looks" random. */
const SECRET_PATH_RE =
  /^\/(api\/auth|api\/connect|connect|join|invite|accept|reset|reset-password|set-password|magic-link|confirm|activate|unsubscribe)(\/|$)/i;

/** A path segment that looks like a generated token: long, and drawn from the alphabet our token
 *  generators actually use (hex / base64url / nanoid). Deliberately loose: a real shop or product
 *  slug this long and this random is not something the catalog produces. */
const TOKENISH_SEGMENT_RE = /^[A-Za-z0-9_-]{24,}$/;

/** Absolute http(s) URLs. Trailing punctuation (a period ending the sentence, a closing bracket)
 *  is excluded so we replace the URL and not the prose around it. */
const URL_RE = /https?:\/\/[^\s<>"')\]]+/g;

/** Bare `key=value` pairs in a query string or an error message, e.g. a rethrown fetch error that
 *  quotes `code=abc123`. Catches the case where there is no full URL to parse. The leading
 *  `[A-Za-z0-9_-]*` is optional so both `code=` and `access_token=` match. */
const BARE_PARAM_RE =
  /\b([A-Za-z0-9_-]*(?:token|secret|code|passcode|password|pwd|apikey|api_key|key|jwt|signature|auth|credential|session|nonce|state))\s*=\s*[^\s&"'<>]+/gi;

/** Anything shaped like an email address. Merchant emails are the identity in this app, so they
 *  never belong in a crash report even when they show up mid-message. */
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

export const REDACTED_URL = "[redacted url]";
export const REDACTED_VALUE = "[redacted]";
export const REDACTED_EMAIL = "[redacted email]";

/**
 * Is this URL carrying a secret that must never leave the app?
 *
 * Returns TRUE (redact) for anything unparseable: an unparseable URL is exactly the case where we
 * cannot reason about it, and the rule is "redact when unsure".
 */
export function isSensitiveUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return true; // can't reason about it, so don't send it
  }

  for (const key of url.searchParams.keys()) {
    if (SECRET_PARAM_RE.test(key)) return true;
  }

  if (SECRET_PATH_RE.test(url.pathname)) return true;

  // Anything else with a token-shaped segment. Catches a future /whatever/<token> route nobody
  // remembered to add above, which is why this is a heuristic and not a list.
  return url.pathname.split("/").some((seg) => TOKENISH_SEGMENT_RE.test(seg));
}

/**
 * Remove bearer secrets and emails from a free-text string (an error message, a URL, a query
 * string). Token-bearing URLs collapse to `[redacted url]`; a non-sensitive URL survives intact so
 * the report still says WHERE the crash happened.
 */
export function redactSecrets(text: string): string {
  let out = text.replace(URL_RE, (match) => (isSensitiveUrl(match) ? REDACTED_URL : match));
  out = out.replace(BARE_PARAM_RE, (_match, key: string) => `${key}=${REDACTED_VALUE}`);
  out = out.replace(EMAIL_RE, REDACTED_EMAIL);
  return out;
}

/**
 * `beforeSend` hook. Scrubs message + exception text, drops the user identity, and strips the
 * credential-bearing parts of the request context while keeping a scrubbed URL for triage.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  const scrub = (s: string | undefined): string | undefined => (s ? redactSecrets(s) : s);

  if (event.message) event.message = scrub(event.message);
  for (const ex of event.exception?.values ?? []) {
    if (ex.value) ex.value = scrub(ex.value);
  }

  // Never ship the account identity or network origin.
  if (event.user) {
    delete event.user.email;
    delete event.user.ip_address;
    delete event.user.username;
  }

  // Request context: keep a scrubbed URL for triage, drop the credential-bearing parts.
  if (event.request) {
    if (typeof event.request.url === "string") event.request.url = scrub(event.request.url);
    if (typeof event.request.query_string === "string") {
      event.request.query_string = scrub(event.request.query_string);
    }
    delete event.request.cookies;
    const headers = event.request.headers as Record<string, string> | undefined;
    if (headers) {
      delete headers.cookie;
      delete headers.authorization;
      delete headers["set-cookie"];
    }
  }

  return event;
}
