/**
 * Liveness probe shared by `/api/health`.
 *
 * Two rules make this file worth its own module:
 *
 * 1. **Nothing from the caught error may escape.** A Neon/pg connection failure
 *    routinely carries the full connection string (password included) in its
 *    message. We return a fixed token instead, never `err.message`, never a
 *    stack, never a host. `runHealthCheck` is the only place that touches the
 *    error and it deliberately discards it.
 * 2. **A hung database must still answer.** A dead TCP connection can block far
 *    past a monitor's patience, so the probe races a timer and reports failure
 *    rather than hanging the request.
 *
 * Only dependencies we own are checked. Third-party APIs (Wix, Cloudinary,
 * Mailgun) are deliberately excluded: a vendor outage must not turn our uptime
 * monitor red, and polling them on every check would add latency and burn rate
 * limit budget.
 */

/** Ceiling for the whole check. Under a monitor's usual 10s request timeout. */
export const HEALTH_TIMEOUT_MS = 4000;

/** The only failure token we ever emit. Coarse on purpose: it leaks nothing. */
export const DB_UNREACHABLE = "database_unreachable" as const;

export type HealthResult =
  | { ok: true; checks: { db: "ok" } }
  | { ok: false; error: typeof DB_UNREACHABLE; checks: { db: "fail" } };

/**
 * Runs `probe` under a timeout and maps any failure to a generic result.
 *
 * @param probe cheapest possible liveness query (`select 1`)
 * @param timeoutMs how long to wait before declaring the database unreachable
 */
export async function runHealthCheck(
  probe: () => Promise<unknown>,
  timeoutMs: number = HEALTH_TIMEOUT_MS,
): Promise<HealthResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    // Start the probe first so a synchronous throw is caught here too.
    const probed = Promise.resolve().then(probe);
    // If the timer wins, `probed` may still reject later with nobody awaiting
    // it; swallow that so it can't surface as an unhandled rejection.
    probed.catch(() => {});

    const timedOut = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error("health_timeout")), timeoutMs);
      // Don't hold the event loop open for a timer nobody is waiting on.
      timer.unref?.();
    });

    await Promise.race([probed, timedOut]);
    return { ok: true, checks: { db: "ok" } };
  } catch {
    // Intentionally ignores the caught value. See rule 1 above: it can contain
    // the database password. Do not add logging of the error here.
    return { ok: false, error: DB_UNREACHABLE, checks: { db: "fail" } };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
