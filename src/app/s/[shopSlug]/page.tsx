import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicShopPage } from "@/db/queries/public";
import { readableOn } from "@/lib/contrast";
import { formatPrice } from "@/lib/format";

// ISR: statically generate shop pages on demand and revalidate every 5 min, so
// async generateMetadata renders the per-shop <title>/OG into <head>. (The
// dynamic-SSR path streams metadata into <body> — invalid + breaks crawler OG.)
export const revalidate = 300;

export function generateStaticParams(): { shopSlug: string }[] {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shopSlug: string }>;
}): Promise<Metadata> {
  const { shopSlug } = await params;
  const data = await getPublicShopPage(shopSlug);
  if (!data) return { title: "Shop not found — Shop.WitUS" };
  return {
    title: `${data.shop.name} — Shop.WitUS`,
    description: `Browse ${data.shop.name} and shop their picks.`,
    openGraph: { title: data.shop.name, description: `Shop ${data.shop.name}.`, type: "website" },
  };
}

export default async function PublicShopPage({
  params,
}: {
  params: Promise<{ shopSlug: string }>;
}) {
  const { shopSlug } = await params;
  const data = await getPublicShopPage(shopSlug);
  if (!data) notFound();
  const { shop, collections } = data;
  const accent = shop.accentColor;
  const buyText = readableOn(accent);

  return (
    <div className="flex min-h-dvh flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        <header className="mb-8">
          {shop.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shop.logoUrl} alt={shop.name} className="mb-3 h-12 w-auto" />
          ) : null}
          <h1 className="text-3xl font-semibold tracking-tight">{shop.name}</h1>
        </header>

        {collections.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-300">This shop hasn’t published anything yet.</p>
        ) : (
          <div className="flex flex-col gap-12">
            {collections.map(({ collection, products }) => (
              <section key={collection.id} aria-labelledby={`collection-${collection.id}`}>
                <h2
                  id={`collection-${collection.id}`}
                  className="mb-4 text-xl font-semibold tracking-tight"
                >
                  {collection.name}
                </h2>
                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {products.map((p) => {
                    const price = formatPrice(p.priceCents, p.currency);
                    return (
                      <li
                        key={p.id}
                        className="flex flex-col overflow-hidden rounded-lg border border-black/10 dark:border-white/15"
                      >
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.imageUrl}
                            alt={p.altText}
                            loading="lazy"
                            className="aspect-square w-full object-cover"
                          />
                        ) : (
                          <div
                            aria-hidden="true"
                            className="aspect-square w-full bg-black/5 dark:bg-white/10"
                          />
                        )}
                        <div className="flex flex-1 flex-col gap-2 p-3">
                          <span className="font-medium leading-snug">{p.name}</span>
                          {price && (
                            <span className="text-sm text-zinc-500 dark:text-zinc-400">{price}</span>
                          )}
                          <a
                            href={p.buyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ backgroundColor: accent, color: buyText }}
                            className="mt-auto inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                          >
                            <span aria-hidden="true">Buy ↗</span>
                            <span className="sr-only">Buy {p.name} (opens in a new tab)</span>
                          </a>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-black/10 py-6 text-center text-xs text-zinc-500 dark:border-white/15 dark:text-zinc-400">
        <a
          href="https://shop.witus.online"
          className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          Powered by Shop.WitUS
        </a>
        <span aria-hidden="true"> · </span>
        Operated by B4C LLC / AwesomeWebStore.com
      </footer>
    </div>
  );
}
