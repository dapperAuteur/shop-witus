import type { NextConfig } from "next";

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

export default nextConfig;
