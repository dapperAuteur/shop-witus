import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3030"),
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
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
};

const parsed = schema.safeParse(input);
if (!parsed.success) {
  throw new Error(
    `Invalid environment variables:\n${JSON.stringify(parsed.error.flatten().fieldErrors, null, 2)}`,
  );
}

export const env = parsed.data;

export const hasMailgun = Boolean(env.MAILGUN_API_KEY && env.MAILGUN_DOMAIN);
export const hasCloudinary = Boolean(
  env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
);
export const hasWix = Boolean(env.WIX_CLIENT_ID && env.WIX_CLIENT_SECRET);
export const hasOutbox = Boolean(env.OUTBOX_INGEST_URL && env.OUTBOX_INGEST_SECRET);
export const hasInbox = Boolean(env.INBOX_INGEST_URL && env.INBOX_INGEST_SECRET);
export const hasPostHog = Boolean(env.NEXT_PUBLIC_POSTHOG_KEY);
