import Link from "next/link";
import { notFound } from "next/navigation";
import { getShop } from "@/db/queries/catalog";
import { requireShopRole } from "@/lib/rbac";
import { ImportForm } from "./import-form";

export default async function ImportPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  await requireShopRole(shopId, "manager");
  const shop = await getShop(shopId);
  if (!shop) notFound();

  return (
    <main id="main" className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link
        href={`/dashboard/${shopId}`}
        className="text-sm text-zinc-500 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:text-zinc-400"
      >
        ← {shop.name}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Import products from CSV</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-300">
        Upload a CSV of your best sellers. Re-uploading updates existing items (matched by SKU, or by
        name when there&apos;s no SKU) — so you can edit and re-import safely.
      </p>

      <p className="mt-4">
        <a
          href="/templates/shop-witus-template.csv"
          download
          className="font-medium text-emerald-700 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:text-emerald-300"
        >
          Download the CSV template
        </a>
      </p>

      <div className="mt-6">
        <ImportForm shopId={shopId} />
      </div>

      <details className="mt-8 text-sm text-zinc-600 dark:text-zinc-300">
        <summary className="cursor-pointer font-medium">CSV columns</summary>
        <p className="mt-2 leading-6">
          Required: <code>name</code>, <code>buy_url</code>, <code>alt_text</code>. Optional:{" "}
          <code>price_cents</code> (e.g. 2499 = $24.99), <code>currency</code>, <code>image_url</code>,{" "}
          <code>sku</code>, <code>collection</code>, <code>sort_order</code>. Up to 500 rows / 1 MB.
        </p>
      </details>
    </main>
  );
}
