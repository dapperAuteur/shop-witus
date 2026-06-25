"use client";

import { useEffect } from "react";

// Privacy-first PostHog. Only loads if NEXT_PUBLIC_POSTHOG_KEY is set, and
// even then autocapture + pageview capture are OFF by default (opt-in, per the
// ecosystem privacy posture). No-op with no key — safe to render always.
export function Analytics() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    let cancelled = false;
    import("posthog-js")
      .then(({ default: posthog }) => {
        if (cancelled) return;
        posthog.init(key, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
          autocapture: false,
          capture_pageview: false,
          capture_pageleave: false,
          persistence: "memory",
        });
      })
      .catch(() => {
        /* analytics is best-effort; never break the app */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
