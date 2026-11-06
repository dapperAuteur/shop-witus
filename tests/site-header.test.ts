import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * Sign-in control rule (witus docs/shared-ui-ux-dx.md, "Sign-in control"): every public header
 * shows a link named exactly "Sign in" to a signed-out visitor, and "Sign out" when signed in.
 * Until 2026-10-31 shop.witus.online had no header at all; the home page's only way in was the
 * "Get started" button (BAM: "shop doesn't have header, but does have get started button").
 * These tests fail if the header loses Sign in, if the label is renamed, if a public page stops
 * rendering the header, or if the header leaks onto a merchant storefront or the embed iframe.
 */

// SignOutButton imports the router and the browser auth client; rendering markup needs neither.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/auth-client", () => ({ authClient: { signOut: vi.fn() } }));

const { SiteHeader, HEADER_SIGN_IN_LABEL } = await import("@/components/site-header");

const ROOT = join(__dirname, "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf-8");
/** Assertions about what the CODE does must not be satisfied (or broken) by a comment. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "");

function links(html: string): { href: string; text: string; cls: string }[] {
  return [...html.matchAll(/<a\b([^>]*)>([^<]*)<\/a>/g)].map((m) => ({
    href: /href="([^"]*)"/.exec(m[1])?.[1] ?? "",
    cls: /class="([^"]*)"/.exec(m[1])?.[1] ?? "",
    text: m[2],
  }));
}

const render = (signedIn: boolean) => renderToStaticMarkup(createElement(SiteHeader, { signedIn }));

describe("SiteHeader sign-in control", () => {
  it('signed out: a header link named exactly "Sign in" to /sign-in', () => {
    const html = render(false);
    expect(html).toMatch(/^<header\b/);
    expect(HEADER_SIGN_IN_LABEL).toBe("Sign in");
    expect(links(html).filter((l) => l.text === "Sign in").map((l) => l.href)).toEqual(["/sign-in"]);
  });

  it("the Sign in link is never hidden at any width, is 44px tall and has a visible focus ring", () => {
    const signIn = links(render(false)).find((l) => l.text === "Sign in");
    expect(signIn).toBeDefined();
    const cls = signIn!.cls.split(/\s+/);
    expect(cls).not.toContain("hidden");
    expect(cls).not.toContain("sr-only");
    expect(cls).toContain("min-h-11");
    expect(cls).toContain("focus-visible:outline-2");
  });

  it('signed in: "Dashboard" and a "Sign out" button, no Sign in', () => {
    const html = render(true);
    expect(links(html).map((l) => l.text)).not.toContain("Sign in");
    expect(links(html)).toContainEqual(expect.objectContaining({ href: "/dashboard", text: "Dashboard" }));
    expect(html).toMatch(/<button\b[^>]*>Sign out<\/button>/);
  });

  it('signed in: the header never offers "Sign out of WitUS everywhere" (that stays on the dashboard)', () => {
    expect(render(true)).not.toContain("Sign out of WitUS everywhere");
  });

  it("is a plain link to this app's own page: no WitUS IdP request from the header", () => {
    expect(render(false)).not.toContain("accounts.witus.online");
    expect(stripComments(read("src/components/site-header.tsx"))).not.toMatch(
      /witus-sso-button|silent-sso|endsession/,
    );
  });

  it("every interactive control is at least 44px tall", () => {
    for (const html of [render(false), render(true)]) {
      for (const l of links(html)) expect(l.cls.split(/\s+/), l.text).toContain("min-h-11");
    }
  });
});

describe("where the header renders", () => {
  it.each(["src/app/page.tsx", "src/app/help/page.tsx", "src/app/sign-in/page.tsx"])(
    "%s renders <SiteHeader signedIn={Boolean(session)} />",
    (file) => {
      const src = stripComments(read(file));
      expect(src).toMatch(/<SiteHeader signedIn=\{Boolean\(session\)\} \/>/);
      expect(src).toMatch(/await getSession\(\)/);
    },
  );

  // Error pages keep the app shell (witus docs/shared-ui-ux-dx.md).
  it("the 404 page renders the header with the session and the footer", () => {
    const src = stripComments(read("src/app/not-found.tsx"));
    expect(src).toMatch(/<SiteHeader signedIn=\{Boolean\(session\)\} \/>/);
    expect(src).toContain("<SiteFooter />");
  });

  it("the root error boundary renders the header (signed-out fallback) and the footer", () => {
    const src = stripComments(read("src/app/error.tsx"));
    expect(src).toContain("<SiteHeader signedIn={false} />");
    expect(src).toContain("<SiteFooter />");
  });

  it("global-error carries its own home and Sign in links", () => {
    const src = stripComments(read("src/app/global-error.tsx"));
    expect(src).toMatch(/href="\/"/);
    expect(src).toMatch(/href="\/sign-in"[^>]*>\s*Sign in\s*</);
  });

  it.each([
    "src/app/s/[shopSlug]/page.tsx",
    "src/app/embed/shop/[shopSlug]/[collectionSlug]/page.tsx",
  ])("%s (merchant-facing) does not render the Shop.WitUS header", (file) => {
    expect(stripComments(read(file))).not.toContain("SiteHeader");
  });
});
