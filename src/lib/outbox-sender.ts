/**
 * Reference sender for the WitUS Outbox signed-webhook contract.
 * Copied VERBATIM from witus-outbox/examples/sender.ts — do not modify.
 *
 * The outbox creates social-post drafts, so wiring it needs a per-product
 * caption recipe (platforms + caption builders). Add a `shop-witus.md`
 * trigger recipe to witus-outbox, then call `sendToOutbox(...)` (typically
 * with `as_draft: true`) from src/lib/ecosystem-events.ts.
 */
import { createHmac } from "node:crypto";

export type OutboxPlatform =
  | "twitter"
  | "instagram"
  | "facebook"
  | "linkedin"
  | "youtube"
  | "bluesky"
  | "tiktok"
  | "pinterest";

export interface OutboxSubmission {
  /** Stable idempotency key from the publisher; (source, external_ref) is unique. */
  external_ref: string;
  platform: OutboxPlatform;
  caption: string;
  /** Public https URLs, ≤5MB each. Empty array allowed. */
  media_urls: string[];
  links?: string[];
  /** ISO-8601 UTC. Receiver requires ≥ now + 5 minutes. */
  scheduled_at: string;
  social_profile_ids?: string[];
  /** When true, outbox lands the row as `status=draft` for operator review. */
  as_draft?: boolean;
}

export interface SendArgs {
  /** Full URL of the receiver, e.g. `https://outbox.your-domain.example/api/ingest`. */
  outboxUrl: string;
  /** Lowercase kebab slug; must match an entry in the receiver's `INGEST_SOURCES`. */
  sourceSlug: string;
  /** Same `hmac_secret` the receiver has configured for this slug. ≥32 chars. */
  hmacSecret: string;
  submission: OutboxSubmission;
}

export interface SendResult {
  ok: boolean;
  status: number;
  id?: string;
  recordStatus?: string;
  detail?: string;
}

export async function sendToOutbox(args: SendArgs): Promise<SendResult> {
  const rawBody = JSON.stringify(args.submission);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", args.hmacSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const res = await fetch(args.outboxUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Witus-Source": args.sourceSlug,
      "X-Witus-Timestamp": timestamp,
      "X-Witus-Signature": `sha256=${signature}`,
    },
    body: rawBody,
  });

  const text = await res.text();
  let body: { ok?: boolean; id?: string; status?: string } = {};
  try {
    body = JSON.parse(text);
  } catch {
    /* leave empty */
  }

  if (res.ok && body.ok && body.id) {
    return { ok: true, status: res.status, id: body.id, recordStatus: body.status };
  }
  return { ok: false, status: res.status, detail: text };
}
