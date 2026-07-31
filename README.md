# Shop.WitUS

A **self-service, embeddable ecommerce-catalog layer** for the [WitUS](https://witus.online) ecosystem.

Merchants import their best-selling products — by **CSV** or by **connecting their Wix store** — and drop a shoppable widget into any website or WitUS app (a Wanderlearn tour, their own Wix/Squarespace/Shopify/WordPress site, plain HTML). Every product click **routes out** to the merchant's existing store. No cart or checkout — pure link-out. Self-service end to end: the operator ships bugs and features only, never per-merchant setup.

## Stack

Next.js 16 (App Router, Webpack) · React 19 · better-auth (magic link) · Drizzle ORM + Neon Postgres · Cloudinary · Tailwind v4 · TypeScript · pnpm. Mirrors `wanderlearn-app`'s stack for cross-repo familiarity.

## Error monitoring

Crash reporting goes to **Better Stack** through the Sentry SDK (`@sentry/nextjs`), on the server, edge, and browser runtimes. It is **off until a DSN is set**: with no `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` the SDK never initializes, sends nothing, and the app behaves exactly as it did before. Tracing and session replay are pinned at `0` (errors only). Every outgoing event runs through `src/lib/sentry-scrub.ts`, which drops the user identity, request cookies, and `authorization` / `cookie` / `set-cookie` headers, and redacts token-bearing URLs (magic links, the Wix OAuth `?code=` callback) and email addresses. See `.env.example` for the variables.

## Health check (point uptime monitors here)

`GET /api/health` is the endpoint to point Better Stack (or any uptime monitor) at — **not** the homepage, which can return a cached 200 while the database is down.

| State | Status | Body |
|---|---|---|
| Healthy | `200` | `{"ok":true,"checks":{"db":"ok"}}` |
| Unhealthy | `503` | `{"ok":false,"error":"database_unreachable","checks":{"db":"fail"}}` |

It runs the cheapest possible liveness query (`select 1`) against Neon, so a green check means the app booted **and** Postgres answered. `HEAD` works too (status only, no body). The response is never cached (`force-dynamic` + `Cache-Control: no-store`) and the check is capped at **4 seconds** (`HEALTH_TIMEOUT_MS` in `src/lib/health.ts`), so a hung database returns 503 quickly instead of stalling the monitor.

Public and unauthenticated by necessity — a monitor cannot sign in — so it discloses nothing: no version, no env values, no row/order/customer data, and **never the caught error**, whose text routinely contains the full connection string including the password. Failures collapse to the single fixed token `database_unreachable`.

Third-party APIs (Wix, Cloudinary, Mailgun) are deliberately **not** checked: a vendor outage is not our downtime, and polling them on every probe would add latency and burn rate-limit budget. This endpoint reports only what we own.

## Quickstart

```bash
pnpm install
cp .env.example .env.local      # fill from plans/user-tasks/ (Neon, auth, Cloudinary, Mailgun, Wix)
pnpm db:migrate                 # apply migrations to your Neon dev branch
pnpm dev                        # http://localhost:3030
```

Dev runs on **port 3030** (3000 is held by wanderlearn-app — BAM runs apps side-by-side).

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Dev server on :3030 |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm typecheck` | `next typegen && tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm db:generate` | Generate a Drizzle migration from schema |
| `pnpm db:migrate` / `pnpm db:migrate:prod` | Apply migrations (local / prod-via-shell) |
| `pnpm db:studio` | Drizzle Studio |

## Layout

- `src/app/` — routes. `src/app/[lang]/` merchant dashboard; `src/app/embed/shop/...` the public widget (only routes with `frame-ancestors *`).
- `src/db/schema/` — Drizzle schema (one file per domain) + barrel.
- `src/lib/` — auth, rbac, cloudinary, actions, env, `sentry-scrub.ts` (crash-report PII scrubber), `health.ts` (uptime probe behind `/api/health`).
- `src/instrumentation.ts` / `src/instrumentation-client.ts` + `sentry.{server,edge}.config.ts` — error monitoring wiring.
- `plans/` — repo-local runbooks, bugs, and operator tasks (gitignored). Start with `plans/runbooks/01-shop-witus-mvp.md`.

## Conventions

Read [STYLE_GUIDE.md](./STYLE_GUIDE.md) before writing code, and [AGENTS.md](./AGENTS.md) (Next 16 has breaking changes — consult `node_modules/next/dist/docs/`). Branch per change; BAM merges; migrations get a `plans/user-tasks/` reminder before merge.

Operated by B4C LLC / AwesomeWebStore.com.
# shop-witus
