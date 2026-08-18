/**
 * Event taxonomy for Shop.WitUS.
 *
 * The ecosystem shares ONE PostHog project, separated by the `app` property that the
 * Analytics provider registers on load. Two rules keep that project readable, and both
 * are cheap now and expensive to retrofit once data has landed:
 *
 *   1. `snake_case`, object first, verb in past tense — `widget_embedded`.
 *   2. NEVER put the app name in the event name. `shop_widget_embedded` is wrong: it
 *      makes the same action from two apps look like two events and kills the
 *      cross-app comparison that sharing a project exists to enable. The `app`
 *      property already carries that.
 *
 * Shared lifecycle events (the SHARED_EVENTS block) use identical names in every
 * ecosystem app, so "where do people fall out of sign-in" is answerable across all of
 * them at once. Do not rename these here without renaming them everywhere.
 *
 * See gemini/witus/plans/26-posthog-ecosystem-rollout.md for the full contract.
 */

/** Slug carried on every event so this app's data stays separable in the shared project. */
export const ANALYTICS_APP = "shop-witus";

/**
 * Events with identical names across every ecosystem app. Names are contractual.
 */
export const SHARED_EVENTS = {
  signinStarted: "signin_started",
  signinSucceeded: "signin_succeeded",
  signinFailed: "signin_failed",
} as const;

/**
 * Events specific to Shop.WitUS. Identify entities by slug or id, never display
 * name — names get reworded and fragment one thing into several series.
 */
export const EVENTS = {
  /** An explicit route view. capture_pageview is off — Next's client router would
   *  fire it once and then lie — so route changes are reported deliberately. */
  routeViewed: "route_viewed",
  ...SHARED_EVENTS,
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
