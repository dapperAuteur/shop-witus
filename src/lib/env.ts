import { z } from "zod";
import {
  WITUS_OIDC_DISCOVERY_FALLBACK,
  endSessionEndpointFromDiscovery,
  silentSsoEndpointFromDiscovery,
} from "./silent-sso";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3030"),
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  // "Sign in with WitUS" — ecosystem OIDC client against the accounts.witus.online
  // IdP. Optional: the SSO provider + button stay off until CLIENT_ID is set, so a
  // missing value never breaks the build or the magic-link flow. The redirect URI
  // the IdP expects: {BETTER_AUTH_URL}/api/auth/oauth2/callback/witus.
  WITUS_OIDC_CLIENT_ID: z.string().optional(),
  WITUS_OIDC_CLIENT_SECRET: z.string().optional(),
  WITUS_OIDC_DISCOVERY_URL: z.string().url().optional(),
  MAILGUN_API_KEY: z.string().optional(),
  MAILGUN_DOMAIN: z.string().optional(),
  MAILGUN_REGION: z.enum(["us", "eu"]).default("us"),
  MAIL_FROM: z.string().optional(),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  // 32-byte key (base64/hex) used to encrypt connector OAuth tokens at rest.
  STORE_TOKEN_ENC_KEY: z.string().optional(),
  WIX_CLIENT_ID: z.string().optional(),
  WIX_CLIENT_SECRET: z.string().optional(),
  WIX_REDIRECT_URI: z.string().url().optional(),
  // WitUS ecosystem integrations (all optional; features no-op until set).
  OUTBOX_INGEST_URL: z.string().url().optional(),
  OUTBOX_SOURCE_SLUG: z.string().optional(),
  OUTBOX_INGEST_SECRET: z.string().optional(),
  INBOX_INGEST_URL: z.string().url().optional(),
  INBOX_SOURCE_SLUG: z.string().optional(),
  INBOX_INGEST_SECRET: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  // Error monitoring: Better Stack, ingested through the Sentry SDK (optional; the SDK is inert
  // without a DSN, see sentry.*.config.ts and src/instrumentation*.ts). SENTRY_DSN is server-side;
  // NEXT_PUBLIC_SENTRY_DSN is the browser DSN. The build-time SENTRY_ORG / SENTRY_PROJECT /
  // SENTRY_AUTH_TOKEN (source-map upload) are read straight from process.env in next.config.ts.
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
});

const isProd = process.env.NODE_ENV === "production";
// `next build` runs with NODE_ENV=production but is not a live runtime; allow
// placeholders so a build (and CI typecheck) never needs real secrets.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const allowDevDefaults = !isProd || isBuildPhase;

const devPlaceholders = {
  DATABASE_URL: "postgres://placeholder:placeholder@localhost/shop_witus_dev",
  BETTER_AUTH_SECRET: "dev-secret-minimum-32-characters-xxxxxxxxxxxx",
  BETTER_AUTH_URL: "http://localhost:3030",
} as const;

const input = {
  NODE_ENV: process.env.NODE_ENV,
  APP_URL: process.env.APP_URL,
  DATABASE_URL:
    process.env.DATABASE_URL ??
    process.env.STORAGE_DATABASE_URL ??
    process.env.STORAGE_POSTGRES_URL ??
    (allowDevDefaults ? devPlaceholders.DATABASE_URL : undefined),
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ?? (allowDevDefaults ? devPlaceholders.BETTER_AUTH_SECRET : undefined),
  BETTER_AUTH_URL:
    process.env.BETTER_AUTH_URL ?? (allowDevDefaults ? devPlaceholders.BETTER_AUTH_URL : undefined),
  WITUS_OIDC_CLIENT_ID: process.env.WITUS_OIDC_CLIENT_ID,
  WITUS_OIDC_CLIENT_SECRET: process.env.WITUS_OIDC_CLIENT_SECRET,
  WITUS_OIDC_DISCOVERY_URL: process.env.WITUS_OIDC_DISCOVERY_URL,
  MAILGUN_API_KEY: process.env.MAILGUN_API_KEY,
  MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN,
  MAILGUN_REGION: process.env.MAILGUN_REGION,
  MAIL_FROM: process.env.MAIL_FROM,
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  STORE_TOKEN_ENC_KEY: process.env.STORE_TOKEN_ENC_KEY,
  WIX_CLIENT_ID: process.env.WIX_CLIENT_ID,
  WIX_CLIENT_SECRET: process.env.WIX_CLIENT_SECRET,
  WIX_REDIRECT_URI: process.env.WIX_REDIRECT_URI,
  OUTBOX_INGEST_URL: process.env.OUTBOX_INGEST_URL,
  OUTBOX_SOURCE_SLUG: process.env.OUTBOX_SOURCE_SLUG,
  OUTBOX_INGEST_SECRET: process.env.OUTBOX_INGEST_SECRET,
  INBOX_INGEST_URL: process.env.INBOX_INGEST_URL,
  INBOX_SOURCE_SLUG: process.env.INBOX_SOURCE_SLUG,
  INBOX_INGEST_SECRET: process.env.INBOX_INGEST_SECRET,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  SENTRY_DSN: process.env.SENTRY_DSN,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
};

const parsed = schema.safeParse(input);
if (!parsed.success) {
  throw new Error(
    `Invalid environment variables:\n${JSON.stringify(parsed.error.flatten().fieldErrors, null, 2)}`,
  );
}

export const env = parsed.data;

export const hasMailgun = Boolean(env.MAILGUN_API_KEY && env.MAILGUN_DOMAIN);
/** True once the WitUS SSO client is provisioned — gates the provider + the button. */
export const hasWitusSso = Boolean(env.WITUS_OIDC_CLIENT_ID);

/**
 * Where the sign-in page's silent "Continue as …" check asks the WitUS IdP who this browser is.
 *
 * `null` — the feature stays completely dark — unless the ecosystem OIDC client is actually
 * provisioned, because an affordance the visitor cannot complete is worse than no affordance. The
 * URL is DERIVED from the discovery URL this app already points at, so nothing new about
 * accounts.witus.online is asserted here (authoritative-values rule). The IdP must also allow this
 * origin with credentials, or the probe simply answers nothing and the button keeps its normal
 * label. See src/lib/silent-sso.ts for the whole design.
 */
export const witusSilentSsoEndpoint: string | null = hasWitusSso
  ? silentSsoEndpointFromDiscovery(env.WITUS_OIDC_DISCOVERY_URL ?? WITUS_OIDC_DISCOVERY_FALLBACK)
  : null;

/**
 * Where sign-out ends the SHARED WitUS session (BAM's decision, 2026-08-30: signing out of one
 * WitUS app signs you out of all of them). Dark under exactly the same condition as the probe: with
 * no ecosystem OIDC client there is no shared session to end, and sign-out stays purely local.
 *
 * client_id IS REQUIRED, not optional. better-auth's endsession endpoint rejects a
 * `post_logout_redirect_uri` with `invalid_request` unless the request carries either a verifiable
 * `id_token_hint` or an explicit `client_id`. We have no id_token client-side, so we send
 * client_id — baked in HERE, on the server, because the sign-out button is a client component and
 * must never be handed the raw env. The caller appends `&post_logout_redirect_uri=…`.
 */
export const witusEndSessionEndpoint: string | null = (() => {
  const clientId = env.WITUS_OIDC_CLIENT_ID;
  if (!clientId) return null;
  const base = endSessionEndpointFromDiscovery(
    env.WITUS_OIDC_DISCOVERY_URL ?? WITUS_OIDC_DISCOVERY_FALLBACK,
  );
  return base ? `${base}?client_id=${encodeURIComponent(clientId)}` : null;
})();
export const hasCloudinary = Boolean(
  env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
);
export const hasWix = Boolean(env.WIX_CLIENT_ID && env.WIX_CLIENT_SECRET);
export const hasOutbox = Boolean(env.OUTBOX_INGEST_URL && env.OUTBOX_INGEST_SECRET);
export const hasInbox = Boolean(env.INBOX_INGEST_URL && env.INBOX_INGEST_SECRET);
export const hasPostHog = Boolean(env.NEXT_PUBLIC_POSTHOG_KEY);
/** Error monitoring is wired to receive events (a DSN is set). Without it the SDK stays inert. */
export const hasSentry = Boolean(env.SENTRY_DSN || env.NEXT_PUBLIC_SENTRY_DSN);
