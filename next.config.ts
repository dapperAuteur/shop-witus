import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // @neondatabase/serverless uses `ws` for websocket transport; its native
  // bindings get mangled by the build minifier unless externalized. Mirrors
  // wanderlearn-app's fix for `TypeError: b.mask is not a function`.
  serverExternalPackages: ["@neondatabase/serverless", "ws"],

  // PostHog's endpoints use trailing slashes (/e/, /flags/, /s/). Without this, Next
  // issues a 308 to the slashless form before the rewrite runs and ingest breaks.
  // Required by PostHog's documented Next.js proxy setup.
  //
  // SIDE EFFECT worth knowing: this disables Next's automatic trailing-slash redirect
  // for EVERY route, not just /ingest — /help/ no longer 308s to /help and both forms
  // become reachable. See gemini/witus plans/26.
  skipTrailingSlashRedirect: true,

  async rewrites() {
    // Reverse-proxy PostHog through our own origin. us.i.posthog.com is on uBlock
    // Origin, Brave Shields, and Safari's tracker list, so a meaningful share of
    // events never leave the browser — including, reliably, our own test visits.
    // Routing ingest through shop.witus.online leaves blockers nothing to match on.
    //
    // Assets come from a different upstream host than ingest, hence two rules. The
    // more specific /static rule must come first.
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  experimental: {
    // Lets requireShopRole() throw a clean 403 via forbidden() instead of
    // silently redirecting. Requires this flag in Next 16.
    authInterrupts: true,
  },
  async headers() {
    return [
      {
        // The embeddable shop widget is meant to be iframed by partner sites
        // (Wix/Squarespace/WordPress/plain HTML) and other WitUS apps.
        // frame-ancestors * opens only the /embed/* routes; the merchant
        // dashboard keeps its default same-origin frame policy.
        source: "/embed/:path*",
        headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *;" }],
      },
    ];
  },
};

// Wrap with Sentry's build plugin (Better Stack ingests via the Sentry SDK). It is safe with no
// Sentry env set: without SENTRY_AUTH_TOKEN it simply skips source-map upload (you just get
// minified stack traces), and the runtime SDK stays inert without a DSN. org/project/authToken all
// come from env so nothing secret is committed here.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  webpack: {
    // Strips the SDK's own debug logging from the bundle. Replaces the deprecated top-level
    // `disableLogger` option. Webpack-only, so it is a no-op under Turbopack (same as the old
    // flag was), but it silences the v10 deprecation warning.
    treeshake: { removeDebugLogging: true },
  },
});
