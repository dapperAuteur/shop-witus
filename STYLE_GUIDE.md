# Shop.WitUS Style Guide

The contract every commit to this repo agrees to. If a change can't satisfy these, the change isn't ready. Lifted and adapted from Wanderlearn's guide — re-read before writing code; re-read when a section feels stale.

Shop.WitUS is a **self-service, embeddable, multi-tenant ecommerce-catalog layer**. Merchants onboard, import products (CSV or store connector), and embed a shoppable widget — themselves. The operator (BAM) ships bugs and features only; **no per-merchant manual setup may ever be required**. Every design choice is measured against that.

---

## Launch gates (non-negotiable)

Every customer-facing surface — above all the **embeddable widget** — must pass all three before it can merge to `main`:

### Mobile-first
- Design at **375×667** first; scale up with Tailwind `sm:`/`lg:`.
- Touch targets **≥ 44×44 px** (`min-h-11` compact, `min-h-12` primary).
- No horizontal scroll at any width ≥ 320 px. The widget renders inside arbitrary host iframes — test narrow.

### WCAG 2.1 AA accessibility
- Keyboard navigable everywhere; every interactive element reachable via Tab, operable via Enter/Space.
- Focus-visible outlines: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current`.
- Contrast ≥ 4.5:1 text / ≥ 3:1 large text + UI, verified in light AND dark.
- Semantic HTML: `<button>` for actions, `<a>` for navigation, ordered headings.
- Inputs always have an associated `<label>` (htmlFor + id); `aria-label` is the fallback.
- Live regions: `role="status" aria-live="polite"` for success, `role="alert"` for errors.
- Product images carry meaningful `alt` (the product name) — **never** the filename, never empty for a product.
- Motion respects `prefers-reduced-motion: reduce`.
- "Buy" links open externally and announce it (see External links below).

### Offline-resilient
- Once a widget has loaded, it stays interactive offline (the outbound store link simply won't resolve without network — that's expected).
- Merchant dashboard + admin + API + auth + connector callbacks are **network-only** (never served stale from cache).

---

## Content policy

**No AI-generated content reaches the customer.** Product names, descriptions, and images are the **merchant's own** (typed, uploaded, or imported from their store). We do not auto-write or auto-translate merchant catalog copy. Our own UI strings are hand-written; Spanish is hand-translated by a human speaker, never machine-translated.

(Tooling vs. content: AI-assisted code, tests, and scaffolding are fine. The rule is about what reaches the shopper.)

---

## Git workflow

### Branch per logical change
- One concern per branch. Branch from `main`, push to `origin`, **never merge yourself** — BAM merges via the GitHub UI.
- Branch name = `type/short-slug` matching the Conventional prefix: `feat/csv-import`, `fix/widget-resize`, `chore/scaffold`, `docs/embed-guide`.

### Conventional Commits
```
type(scope): summary in present tense, under 70 chars

Body explains the why. Constraints, trade-offs, follow-ups. Wrap ~72 chars.
```
Allowed `type`: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `a11y`, `i18n`.

### Never merge to `main` yourself
End-of-branch contract: `branch → commit → push → stop`. Re-check `git branch --show-current` before **every** commit — mid-session fast-forwards mean local main may have moved.

### Database migration before merge
Any Drizzle migration must surface a `pnpm db:migrate:prod` reminder as a `plans/user-tasks/NN-run-migration-<slug>.md` entry — without it, the next prod deploy 500s on the missing column. The feature branch can't merge until that user-task is Done.

### No `--force` to shared branches. No skipping hooks (`--no-verify`).

---

## Plans / bugs / user-tasks discipline

`plans/` is **gitignored** — repo-local scratch.
- `plans/runbooks/` — implementation runbooks (the MVP plan lives at `plans/runbooks/01-shop-witus-mvp.md`).
- `plans/bugs/` — one file per bug, `NN-slug.md`. Check before writing code that could touch a known bug.
- `plans/user-tasks/` — operator handoffs (anything BAM must do outside the editor: Neon, secrets, DNS, OAuth-app registration, PR merges). **No exceptions for "small" steps.** Index at `plans/user-tasks/00-descriptions.md` with columns `# | Title | Scope | Blocks | Status` — the `Blocks` column is non-negotiable.

**Self-service is a hard rule:** if a feature would require BAM to do something per-merchant (approve a signup, run SQL for a tenant, hand-edit a catalog), it is not done. Onboarding, import, and embedding must be fully merchant-operable.

---

## Code patterns

### Server actions (validation contract)
- `"use server"` modules under `src/lib/actions/`.
- Validate every input with zod. Authenticate via the shop-scoped guards (`requireUser` / `requireShopRole`).
- Return shape: `{ ok: true; data: T } | { ok: false; error: string; code: string }`. **Never throw** to a client component.
- `revalidatePath()` every cache the action invalidates — including the public `/embed/shop/...` path when catalog data changes.

### Multi-tenant safety
- Every product/collection/connection query is scoped by `shopId`, derived from the authenticated session — never from a client-supplied id alone. A merchant must never read or write another shop's data.
- Public widget queries expose only **published** collections and **active** products, and never any user/PII fields.

### Embedding
- The widget lives under `/embed/*` (the only routes with `Content-Security-Policy: frame-ancestors *`). Keep it dependency-light and SSR-rendered.
- The host iframe auto-resizes via a `postMessage` height handshake — keep the message contract stable and documented in `docs/EMBED_SHOP.md`.

### External ("Buy") links
Open the merchant's store in a new tab, safely and accessibly:
```tsx
<a href={buyUrl} target="_blank" rel="noopener noreferrer" className="...focus-visible:outline-2 ...">
  {label}
  <span aria-hidden="true"> ↗</span>
  <span className="sr-only"> ({dict.shop.externalIndicator})</span>
</a>
```

### i18n (dictionary loader, en + es)
- All user-facing strings live in `src/app/[lang]/dictionaries/{en,es}.json`, loaded server-side via `getDictionary(lang)`. No string literals in components.
- Every new string lands in both `en.json` and `es.json` in the same commit. Spanish is hand-translated.

### Database / migrations
- Schema in `src/db/schema/*.ts` (one file per logical group) + a barrel `index.ts`. Generate with `pnpm db:generate`.
- Local migrate: `pnpm db:migrate` (loads `.env.local`). Prod: `pnpm db:migrate:prod` (DATABASE_URL from the shell, never a `.env`).
- Migration filenames are Drizzle-assigned — don't rename.

### Secrets / tokens
- Never read or commit `.env*` files. OAuth tokens for store connectors are encrypted at rest with `STORE_TOKEN_ENC_KEY` before they touch the DB.

### Media (Cloudinary)
- Product images go through signed uploads; build delivery URLs via the `cloudinary-urls` helpers, never by hand. Merchant-supplied external `image_url`s are allowed but validated.

### Component organization
- Server components by default; add `"use client"` only when interaction/state requires it.
- Co-locate small client components beside their route; promote to `src/components/` when used by ≥ 2 routes.
- Props get explicit interfaces. Named exports only (Next pages/layouts are the sole `export default` exception).

### Dark mode + motion
- `prefers-color-scheme: dark` (no manual toggle); use Tailwind `dark:`. Verify every surface in both modes.
- Motion respects `prefers-reduced-motion`.

---

## When in doubt
- Re-read this file and `plans/runbooks/01-shop-witus-mvp.md`.
- Check `plans/bugs/` before touching a known issue and `plans/user-tasks/00-descriptions.md` (Blocks column) before assuming an operational dependency is resolved.
- Don't invent features outside the MVP scope — new behavior gets a `plans/future/NN-slug.md` and a conversation, not a commit.
