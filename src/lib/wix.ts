import { env } from "./env";

// Wix Stores connector client. Verified against:
//   OAuth (client_credentials + instance_id): https://www.wixapis.com/oauth/access
//   Query Products (Catalog V3):              https://www.wixapis.com/stores/v3/products/query
// Access tokens live ~5 min, so we mint one per import run from the app secret
// + the merchant's stored instance id (no long-lived token storage for Wix).

const WIX_OAUTH_URL = "https://www.wixapis.com/oauth/access";
const WIX_PRODUCTS_QUERY_URL = "https://www.wixapis.com/stores/v3/products/query";

export async function getWixAccessToken(instanceId: string): Promise<string> {
  if (!env.WIX_CLIENT_ID || !env.WIX_CLIENT_SECRET) {
    throw new Error("Wix app is not configured (WIX_CLIENT_ID / WIX_CLIENT_SECRET).");
  }
  const res = await fetch(WIX_OAUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: env.WIX_CLIENT_ID,
      client_secret: env.WIX_CLIENT_SECRET,
      instance_id: instanceId,
    }),
  });
  if (!res.ok) throw new Error(`Wix token request failed (${res.status}).`);
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("Wix token response missing access_token.");
  return json.access_token;
}

export interface WixProduct {
  externalId: string;
  name: string;
  buyUrl: string;
  priceCents: number | null;
  currency: string | null;
  imageUrl: string | null;
  altText: string;
}

interface WixApiProduct {
  id: string;
  name: string;
  url?: { url?: string };
  price?: { priceAfterDiscount?: string; currency?: string };
  media?: { main?: { url?: string; altText?: string } };
}

function toCents(price?: string): number | null {
  if (!price) return null;
  const n = Number.parseFloat(price);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

function mapProduct(p: WixApiProduct): WixProduct | null {
  const buyUrl = p.url?.url;
  if (!buyUrl) return null; // not shoppable without a product page link
  return {
    externalId: p.id,
    name: p.name,
    buyUrl,
    priceCents: toCents(p.price?.priceAfterDiscount),
    currency: p.price?.currency ?? null,
    imageUrl: p.media?.main?.url ?? null,
    altText: p.media?.main?.altText || p.name,
  };
}

// Pull up to `max` visible products (paged, 100/request). The merchant later
// curates these down to their best sellers in the import UI.
export async function listWixProducts(instanceId: string, max = 100): Promise<WixProduct[]> {
  const token = await getWixAccessToken(instanceId);
  const out: WixProduct[] = [];
  let cursor = "";

  while (out.length < max) {
    const res = await fetch(WIX_PRODUCTS_QUERY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: ["URL", "CURRENCY", "MEDIA_ITEMS_INFO", "THUMBNAIL"],
        query: {
          cursorPaging: { limit: Math.min(100, max - out.length), cursor: cursor || undefined },
          filter: { visible: { $eq: true } },
          sort: [{ fieldName: "updatedDate", order: "DESC" }],
        },
      }),
    });
    if (!res.ok) throw new Error(`Wix products query failed (${res.status}).`);
    const json = (await res.json()) as {
      products?: WixApiProduct[];
      pagingMetadata?: { cursor?: string; hasNext?: boolean };
    };
    for (const p of json.products ?? []) {
      const mapped = mapProduct(p);
      if (mapped) out.push(mapped);
    }
    if (!json.pagingMetadata?.hasNext || !json.pagingMetadata.cursor) break;
    cursor = json.pagingMetadata.cursor;
  }

  return out;
}
