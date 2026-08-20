"use client";

import posthog from "posthog-js";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ANALYTICS_APP, EVENTS } from "@/lib/analytics/events";
import { capture } from "@/lib/analytics/capture";

/**
 * Initialises PostHog once, in the browser, and only when a key is configured.
 * This is this repo's copy of the ecosystem-standard provider (reference:
 * gemini/witus/lib/analytics/posthog-provider.tsx, contract in plans/26 there);
 * it keeps the pre-existing `Analytics` name and file path from the original stub.
 *
 * Keyless is a first-class state, not a failure: local dev, previews, and any deploy
 * before the env vars are set all render normally with capture switched off. Every
 * helper in @/lib/analytics/capture no-ops when this never ran.
 *
 * Privacy posture — decided ecosystem-wide 2026-07-28 (witus plans/26), set here rather
 * than in the PostHog dashboard so it is reviewable in the diff and cannot be changed by
 * someone clicking a toggle:
 *
 * - `autocapture: false` — autocapture records every click and keystroke, which on this
 *   app means the merchant sign-in form and dashboard inputs. It is also the main
 *   driver of event volume against the shared project's quota.
 * - `disable_session_recording: true` — same objection, much larger. Replay needs its
 *   own decision and a consent gate before it goes anywhere near a public surface.
 * - `persistence: "memory"` — no cookie, no localStorage. Analytics identity lives for
 *   one page session and is then gone, which is why this ships WITHOUT a consent banner.
 *   The cost: every hard navigation looks like a new visitor, so treat unique counts as
 *   sessions. Ratios between events survive this distortion.
 * - `capture_pageview: false` — Next's client router does not do full page loads, so
 *   PostHog's automatic pageview would fire once and then under-report every
 *   subsequent route. Route views are explicit in the taxonomy instead.
 *
 * `api_host` points at our own `/ingest` path, which next.config.ts rewrites to
 * PostHog. Ad blockers match on the vendor hostname, so proxying through our origin is
 * what stops a large share of events from being dropped before they are ever sent.
 * `ui_host` still has to name the real dashboard so "view in PostHog" links resolve.
 */
export function Analytics({
  apiKey,
  apiHost,
}: {
  apiKey: string | null;
  apiHost: string;
}) {
  // Only usePathname, deliberately. useSearchParams would force every page under this
  // layout into a Suspense boundary or opt them out of static rendering — too high a
  // price for query strings we don't currently analyse.
  const pathname = usePathname();

  // Gates the route effect below. Using explicit state rather than reading
  // posthog.__loaded means correctness does not depend on whether init sets that flag
  // synchronously — an internal detail of a minified dependency that could change in a
  // patch release and would fail silently by dropping the first pageview of every visit.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!apiKey) return;
    if (posthog.__loaded) {
      setReady(true);
      return;
    }

    posthog.init(apiKey, {
      api_host: apiHost,
      ui_host: "https://us.posthog.com",
      autocapture: false,
      disable_session_recording: true,
      persistence: "memory",
      capture_pageview: false,
      capture_pageleave: false,
      // Shared ecosystem project: every event from this app carries `app` so the
      // other apps' data stays separable. An unlabelled event means this never ran.
      loaded: (ph) => {
        ph.register({ app: ANALYTICS_APP });
        setReady(true);
      },
    });
  }, [apiKey, apiHost]);

  // Replaces capture_pageview, which cannot see App Router client-side navigations —
  // it would fire once on load and then under-report every subsequent route.
  //
  // Depends on `ready` as well as `pathname` so the landing route is captured even
  // though init has not finished when this first runs. Without that dependency the
  // first pageview of every visit is dropped, and on a single-page visit that means
  // the entire visit goes unrecorded.
  useEffect(() => {
    if (!ready) return;
    capture(EVENTS.routeViewed, { pathname });
  }, [pathname, ready]);

  return null;
}
