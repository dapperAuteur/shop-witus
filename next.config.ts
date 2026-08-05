import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // @neondatabase/serverless uses `ws` for websocket transport; its native
  // bindings get mangled by the build minifier unless externalized. Mirrors
  // wanderlearn-app's fix for `TypeError: b.mask is not a function`.
  serverExternalPackages: ["@neondatabase/serverless", "ws"],
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
