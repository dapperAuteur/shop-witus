import { describe, expect, it } from "vitest";
import { DB_UNREACHABLE, runHealthCheck } from "@/lib/health";

const SECRET_URL = "postgres://shop:sup3r-s3cret@ep-example.neon.tech/shop_witus";

describe("runHealthCheck", () => {
  it("reports ok when the probe resolves", async () => {
    await expect(runHealthCheck(async () => [{ "?column?": 1 }])).resolves.toEqual({
      ok: true,
      checks: { db: "ok" },
    });
  });

  it("reports a generic failure when the probe rejects", async () => {
    await expect(
      runHealthCheck(async () => {
        throw new Error("connect ECONNREFUSED");
      }),
    ).resolves.toEqual({ ok: false, error: DB_UNREACHABLE, checks: { db: "fail" } });
  });

  it("catches a synchronous throw too", async () => {
    await expect(
      runHealthCheck(() => {
        throw new Error("boom");
      }),
    ).resolves.toEqual({ ok: false, error: DB_UNREACHABLE, checks: { db: "fail" } });
  });

  it("never leaks the error text, which can carry the database password", async () => {
    const result = await runHealthCheck(async () => {
      throw new Error(`could not connect to ${SECRET_URL}`);
    });

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("sup3r-s3cret");
    expect(serialized).not.toContain("neon.tech");
    expect(serialized).not.toContain("could not connect");
    // Only the two coarse keys, nothing carrying detail.
    expect(Object.keys(result).sort()).toEqual(["checks", "error", "ok"]);
  });

  it("fails fast instead of hanging when the database never answers", async () => {
    const started = Date.now();
    const result = await runHealthCheck(() => new Promise(() => {}), 30);

    expect(result).toEqual({ ok: false, error: DB_UNREACHABLE, checks: { db: "fail" } });
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("does not raise an unhandled rejection when a timed-out probe fails later", async () => {
    const result = await runHealthCheck(
      () =>
        new Promise((_resolve, reject) => {
          setTimeout(() => reject(new Error(SECRET_URL)), 20);
        }),
      5,
    );

    expect(result.ok).toBe(false);
    // Give the late rejection time to land; an unhandled one fails the run.
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
});
