import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { HEALTH_TIMEOUT_MS, runHealthCheck, type HealthResult } from "@/lib/health";

// Public, unauthenticated uptime probe: a monitor cannot sign in. It therefore
// reports nothing an attacker could use: no version, no env values, no row or
// order counts, no customer data. Just whether the database answers.
//
// 200 {"ok":true,"checks":{"db":"ok"}}
// 503 {"ok":false,"error":"database_unreachable","checks":{"db":"fail"}}
//
// Only the database is checked. Wix and other third-party APIs are excluded on
// purpose: their outage is not our downtime (see src/lib/health.ts).

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
} as const;

async function check(): Promise<HealthResult> {
  // Cheapest possible round trip that proves the pool can reach Postgres.
  return runHealthCheck(() => db.execute(sql`select 1`), HEALTH_TIMEOUT_MS);
}

export async function GET() {
  const result = await check();
  return Response.json(result, {
    status: result.ok ? 200 : 503,
    headers: NO_STORE,
  });
}

// Some monitors probe with HEAD; answer with the status and no body.
export async function HEAD() {
  const result = await check();
  return new Response(null, {
    status: result.ok ? 200 : 503,
    headers: NO_STORE,
  });
}
