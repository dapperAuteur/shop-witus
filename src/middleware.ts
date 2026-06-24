import { NextResponse, type NextRequest } from "next/server";

// Best-effort rate limit for the public embed surface. NOTE: serverless
// instances do not share memory, so this caps abuse per-instance only —
// back it with Vercel KV / Upstash for real protection (Phase 4 fast-follow).
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 120;

const hits = new Map<string, { count: number; reset: number }>();

export function middleware(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const now = Date.now();
  const rec = hits.get(ip);

  if (!rec || now > rec.reset) {
    hits.set(ip, { count: 1, reset: now + WINDOW_MS });
  } else {
    rec.count += 1;
    if (rec.count > MAX_PER_WINDOW) {
      return new NextResponse("Too many requests", {
        status: 429,
        headers: { "Retry-After": "60" },
      });
    }
  }

  // Opportunistic cleanup so the map can't grow unbounded within an instance.
  if (hits.size > 10_000) {
    for (const [key, val] of hits) {
      if (now > val.reset) hits.delete(key);
    }
  }

  return NextResponse.next();
}

export const config = { matcher: "/embed/:path*" };
