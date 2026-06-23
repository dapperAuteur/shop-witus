// Central env access. Phase 1 tightens this with zod validation across the
// full set (auth, Cloudinary, Mailgun, Wix OAuth, token-encryption key).
// Kept non-throwing at import time so `next build` succeeds without secrets.
export const env = {
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgres://placeholder:placeholder@localhost/shop_witus_dev",
  APP_URL: process.env.APP_URL ?? "http://localhost:3030",
} as const;
