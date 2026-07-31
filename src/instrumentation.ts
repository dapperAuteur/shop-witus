import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";

// Next.js instrumentation hook. Loads the right Sentry config per runtime, and reports server-side
// App Router errors via onRequestError. Everything is inert without a SENTRY_DSN (see the configs).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("../sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge") await import("../sentry.edge.config");
}

// Captures errors thrown while rendering/serving a request. captureRequestError attaches the route
// and the request context; src/lib/sentry-scrub.ts then strips the cookies, auth headers, and any
// token-bearing URL before the event leaves. No-op when the SDK was never initialized.
export const onRequestError: Instrumentation.onRequestError = Sentry.captureRequestError;
