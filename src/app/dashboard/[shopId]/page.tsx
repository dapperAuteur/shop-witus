import Link from "next/link";
import { notFound } from "next/navigation";
import { getShop, listCollections, listProducts } from "@/db/queries/catalog";
import {
  createCollectionAction,
  deleteProductAction,
  setCollectionStatusAction,
  setProductStatusAction,
} from "@/lib/actions/catalog";
import { requireShopRole } from "@/lib/rbac";

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

const btn =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-black/15 px-3 text-sm font-medium hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:border-white/20 dark:hover:bg-white/5";

export default async function ShopPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  await requireShopRole(shopId, "staff");
  const shop = await getShop(shopId);
  if (!shop) notFound();

  const [collections, products] = await Promise.all([
    listCollections(shopId),
    listProducts(shopId),
  ]);

  // Active product count per collection — drives the publish gate below.
  const activeByCollection = new Map<string, number>();
  for (const p of products) {
    if (p.status === "active" && p.collectionId) {
      activeByCollection.set(p.collectionId, (activeByCollection.get(p.collectionId) ?? 0) + 1);
    }
  }

  return (
    <main id="main" className="mx-auto w-full max-w-4xl px-4 py-10">
      <Link
        href="/dashboard"
        className="text-sm text-zinc-500 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:text-zinc-400"
      >
        ← All shops
      </Link>
      <header className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{shop.name}</h1>
          <p className="font-mono text-sm text-zinc-500 dark:text-zinc-400">/{shop.slug}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/${shopId}/embed`}
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-black/15 px-5 text-sm font-semibold hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:border-white/20 dark:hover:bg-white/5"
          >
            Embed
          </Link>
          <Link
            href={`/dashboard/${shopId}/import`}
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            Import CSV
          </Link>
        </div>
      </header>

      <section aria-labelledby="collections-h" className="mt-10">
        <h2 id="collections-h" className="text-lg font-semibold">
          Collections
        </h2>
        <form action={createCollectionAction} className="mt-3 flex gap-2">
          <input type="hidden" name="shopId" value={shopId} />
          <label htmlFor="new-collection" className="sr-only">
            New collection name
          </label>
          <input
            id="new-collection"
            name="name"
            required
            placeholder="New collection name (e.g. Best Sellers)"
            className="min-h-11 flex-1 rounded-md border border-black/15 bg-transparent px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:border-white/20"
          />
          <button type="submit" className={btn}>
            Add
          </button>
        </form>
        <ul className="mt-3 flex flex-col gap-2">
          {collections.length === 0 ? (
            <li className="rounded-lg border border-black/10 p-4 text-sm text-zinc-500 dark:border-white/15 dark:text-zinc-400">
              No collections yet.
            </li>
          ) : (
            collections.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-black/10 p-4 dark:border-white/15"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      c.status === "published"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-black/5 text-zinc-600 dark:bg-white/10 dark:text-zinc-300"
                    }`}
                  >
                    {c.status}
                  </span>
                  <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">/{c.slug}</span>
                </div>
                {c.status === "published" || (activeByCollection.get(c.id) ?? 0) > 0 ? (
                  <form action={setCollectionStatusAction}>
                    <input type="hidden" name="shopId" value={shopId} />
                    <input type="hidden" name="collectionId" value={c.id} />
                    <input
                      type="hidden"
                      name="status"
                      value={c.status === "published" ? "draft" : "published"}
                    />
                    <button type="submit" className={btn}>
                      {c.status === "published" ? "Unpublish" : "Publish"}
                    </button>
                  </form>
                ) : (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Add an active product to publish
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      </section>

      <section aria-labelledby="products-h" className="mt-10">
        <h2 id="products-h" className="text-lg font-semibold">
          Products ({products.length})
        </h2>
        {products.length === 0 ? (
          <p className="mt-3 rounded-lg border border-black/10 p-4 text-sm text-zinc-600 dark:border-white/15 dark:text-zinc-300">
            No products yet.{" "}
            <Link href={`/dashboard/${shopId}/import`} className="underline">
              Import a CSV
            </Link>{" "}
            to add your best sellers.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {products.map((p) => {
              const price = formatPrice(p.priceCents, p.currency);
              return (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg border border-black/10 p-3 dark:border-white/15"
                >
                  {p.imageUrl ? (
                    // External merchant image host; arbitrary origins make next/image impractical.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrl}
                      alt={p.altText}
                      width={48}
                      height={48}
                      loading="lazy"
                      className="h-12 w-12 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 shrink-0 rounded bg-black/5 dark:bg-white/10" aria-hidden="true" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {price ?? "No price"}
                      {p.status === "hidden" ? " · hidden" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <a
                      href={p.buyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={btn}
                    >
                      Buy<span aria-hidden="true"> ↗</span>
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                    <form action={setProductStatusAction}>
                      <input type="hidden" name="shopId" value={shopId} />
                      <input type="hidden" name="productId" value={p.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={p.status === "active" ? "hidden" : "active"}
                      />
                      <button type="submit" className={btn}>
                        {p.status === "active" ? "Hide" : "Show"}
                      </button>
                    </form>
                    <form action={deleteProductAction}>
                      <input type="hidden" name="shopId" value={shopId} />
                      <input type="hidden" name="productId" value={p.id} />
                      <button
                        type="submit"
                        className="inline-flex min-h-11 items-center justify-center rounded-md border border-black/15 px-3 text-sm font-medium text-red-600 hover:bg-red-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:border-white/20 dark:text-red-400"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
