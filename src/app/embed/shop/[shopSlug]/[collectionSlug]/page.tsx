import { notFound } from "next/navigation";
import { getEmbedCollection } from "@/db/queries/public";
import { readableOn } from "@/lib/contrast";
import { EmbedResizer } from "./embed-resizer";

const HEX = /^#[0-9a-fA-F]{6}$/;

function formatPrice(cents: number | null, currency: string | null): string | null {
  if (cents == null) return null;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency ?? "USD",
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency ?? ""}`.trim();
  }
}

// Self-contained inline styling (no Tailwind) keeps the widget robust inside
// arbitrary host iframes and lets the merchant's accent color be applied
// dynamically. A tiny <style> block adds focus-visible + sr-only + reduced
// motion, which inline styles can't express.
const WIDGET_CSS = `
.sw-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.sw-buy:focus-visible,.sw-card a:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.sw-card{transition:transform .15s ease}
.sw-card:hover{transform:translateY(-2px)}
@media (prefers-reduced-motion:reduce){.sw-card{transition:none}.sw-card:hover{transform:none}}
`;

interface EmbedPageProps {
  params: Promise<{ shopSlug: string; collectionSlug: string }>;
  searchParams: Promise<{
    theme?: string;
    accent?: string;
    hidechrome?: string;
    layout?: string;
  }>;
}

export default async function EmbedPage({ params, searchParams }: EmbedPageProps) {
  const { shopSlug, collectionSlug } = await params;
  const sp = await searchParams;
  const data = await getEmbedCollection(shopSlug, collectionSlug);
  if (!data) notFound();
  const { shop, collection, products } = data;

  const dark = sp.theme === "dark";
  const accent = sp.accent && HEX.test(sp.accent) ? sp.accent : shop.accentColor;
  const buyText = readableOn(accent);
  const hideChrome = sp.hidechrome === "1" || sp.hidechrome === "true";
  const list = sp.layout === "list";

  const bg = dark ? "#09090b" : "#ffffff";
  const fg = dark ? "#fafafa" : "#18181b";
  const muted = dark ? "#a1a1aa" : "#71717a";
  const border = dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.1)";

  return (
    <div
      style={{
        background: bg,
        color: fg,
        fontFamily:
          "system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif",
      }}
    >
      <style>{WIDGET_CSS}</style>
      <EmbedResizer />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
        <h1 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 600 }}>{collection.name}</h1>

        {products.length === 0 ? (
          <p style={{ color: muted, fontSize: 14 }}>No items yet.</p>
        ) : (
          <ul
            style={{
              display: "grid",
              gridTemplateColumns: list ? "1fr" : "repeat(auto-fill,minmax(150px,1fr))",
              gap: 12,
              listStyle: "none",
              padding: 0,
              margin: 0,
            }}
          >
            {products.map((p) => {
              const price = formatPrice(p.priceCents, p.currency);
              return (
                <li
                  key={p.id}
                  className="sw-card"
                  style={{
                    border: `1px solid ${border}`,
                    borderRadius: 10,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: list ? "row" : "column",
                  }}
                >
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrl}
                      alt={p.altText}
                      loading="lazy"
                      style={{
                        width: list ? 110 : "100%",
                        height: list ? 110 : 150,
                        objectFit: "cover",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      style={{
                        width: list ? 110 : "100%",
                        height: list ? 110 : 150,
                        background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <div
                    style={{
                      padding: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}>{p.name}</span>
                    {price && <span style={{ color: muted, fontSize: 14 }}>{price}</span>}
                    <a
                      className="sw-buy"
                      href={p.buyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        marginTop: "auto",
                        background: accent,
                        color: buyText,
                        textAlign: "center",
                        padding: "0 14px",
                        borderRadius: 8,
                        textDecoration: "none",
                        fontWeight: 600,
                        fontSize: 14,
                        minHeight: 44,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span aria-hidden="true">Buy ↗</span>
                      <span className="sw-sr">Buy {p.name} (opens in a new tab)</span>
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {!hideChrome && (
          <p style={{ marginTop: 16, fontSize: 12, color: muted, textAlign: "center" }}>
            Powered by Shop.WitUS
          </p>
        )}
      </div>
    </div>
  );
}
