import Link from "next/link";
import { notFound } from "next/navigation";
import { getShop } from "@/db/queries/catalog";
import { listPublishedCollections } from "@/db/queries/public";
import { requireShopRole } from "@/lib/rbac";
import { EmbedGenerator } from "./embed-generator";

export default async function EmbedSettingsPage({
  params,
}: {
  params: Promise<{ shopId: string }>;
}) {
  const { shopId } = await params;
  await requireShopRole(shopId, "staff");
  const shop = await getShop(shopId);
  if (!shop) notFound();
  const collections = await listPublishedCollections(shopId);

  return (
    <main id="main" className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link
        href={`/dashboard/${shopId}`}
        className="text-sm text-zinc-500 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:text-zinc-400"
      >
        ← {shop.name}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Embed your shop</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-300">
        Drop your products into any website or WitUS app. Every product click opens your store in a
        new tab — Shop.WitUS never handles checkout.
      </p>

      <div className="mt-6">
        <EmbedGenerator
          shopSlug={shop.slug}
          collections={collections.map((c) => ({ slug: c.slug, name: c.name }))}
        />
      </div>

      <section className="mt-10 text-sm text-zinc-600 dark:text-zinc-300">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Where to paste it
        </h2>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
          <li>
            <strong>Wix:</strong> Add → Embed Code → Embed HTML → paste → Update.
          </li>
          <li>
            <strong>Squarespace:</strong> Add a Code block → paste.
          </li>
          <li>
            <strong>WordPress:</strong> add a Custom HTML block → paste.
          </li>
          <li>
            <strong>Plain HTML / any site:</strong> paste anywhere in the page body.
          </li>
        </ul>
      </section>
    </main>
  );
}
