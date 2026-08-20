import type { Metadata } from "next";
import { Analytics } from "@/components/analytics";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shop.WitUS — your products, embeddable anywhere",
  description:
    "Self-service embeddable product catalog. Import your best sellers, drop a shoppable widget into any site, and route every click to your store.",
  icons: {
    icon: [
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/brand/favicon-180.png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-white text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-50">
        {children}
        <Analytics
          // Read here, in a Server Component, and passed down — rather than reading
          // process.env inside the client component — so the env surface stays in one
          // place. `?? null` is meaningful: it is what puts the provider in its
          // supported keyless state instead of initialising with `undefined`.
          apiKey={process.env.NEXT_PUBLIC_POSTHOG_KEY ?? null}
          // "/ingest" is proxied to PostHog by next.config.ts so ad blockers can't
          // drop events. NEXT_PUBLIC_POSTHOG_HOST stays the source of truth for the
          // real upstream host and is used for server-side capture, not the browser.
          apiHost="/ingest"
        />
        {/* Vercel Web Analytics: cookieless pageview counts + Web Vitals, no consent
            surface. Complements PostHog (which owns product events, witus plan 26)
            rather than replacing it. Sends nothing until Web Analytics is ENABLED on
            the Vercel project. */}
        <VercelAnalytics />
      </body>
    </html>
  );
}
