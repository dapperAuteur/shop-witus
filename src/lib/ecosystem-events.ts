import { env, hasInbox } from "./env";
import { type InboxSubmission, sendToInbox } from "./inbox-sender";

// Fire-and-forget WitUS ecosystem events. These NO-OP until the inbox creds
// are set (INBOX_INGEST_URL / INBOX_SOURCE_SLUG / INBOX_INGEST_SECRET — see
// .env.example) and activate instantly when they are. Never throws to the
// caller; logs status only (never the body/secret/signature). Wire call sites
// with Next 16 `after(() => notifyX(...))` so they never block the response.
//
// Outbox (social drafts): the sender is copied verbatim in ./outbox-sender.
// It needs a per-product caption recipe (a `shop-witus.md` in witus-outbox)
// before it can emit posts, so it is intentionally not auto-wired here.

async function toInbox(submission: InboxSubmission): Promise<void> {
  if (!hasInbox) return;
  try {
    const res = await sendToInbox({
      inboxUrl: env.INBOX_INGEST_URL as string,
      sourceSlug: env.INBOX_SOURCE_SLUG ?? "shop-witus",
      hmacSecret: env.INBOX_INGEST_SECRET as string,
      submission,
    });
    if (!res.ok) console.warn(`[inbox] ${submission.form_type} -> ${res.status}`);
  } catch (e) {
    console.warn(`[inbox] ${submission.form_type} failed:`, e instanceof Error ? e.message : e);
  }
}

export async function notifyMerchantSignup(input: {
  email: string;
  shopId: string;
  shopSlug: string;
}): Promise<void> {
  await toInbox({
    form_type: "shop-witus-signup",
    submitter_email: input.email,
    priority: "normal",
    payload: { shop_id: input.shopId, shop_slug: input.shopSlug },
  });
}

export async function notifyProductsImported(input: {
  shopId: string;
  count: number;
  source: "csv" | "wix";
}): Promise<void> {
  await toInbox({
    form_type: "shop-witus-import",
    payload: { shop_id: input.shopId, count: input.count, source: input.source },
  });
}

export async function notifyCollectionPublished(input: {
  shopId: string;
  collectionId: string;
}): Promise<void> {
  await toInbox({
    form_type: "shop-witus-publish",
    payload: { shop_id: input.shopId, collection_id: input.collectionId },
  });
}
