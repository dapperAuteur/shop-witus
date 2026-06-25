"use client";

import { useActionState, useState } from "react";
import { createProduct } from "@/lib/actions/catalog";
import { ImageUploader } from "@/components/image-uploader";

type AddResult = Awaited<ReturnType<typeof createProduct>>;

const fieldCls =
  "min-h-11 rounded-md border border-black/15 bg-transparent px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:border-white/20";
const labelCls = "flex flex-col gap-1 text-sm font-medium";

export function AddProductForm({
  shopId,
  collections,
}: {
  shopId: string;
  collections: { id: string; name: string }[];
}) {
  const [imageUrl, setImageUrl] = useState("");
  const [state, action, pending] = useActionState<AddResult | null, FormData>(
    async (_prev, fd) => createProduct(fd),
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="shopId" value={shopId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelCls}>
          Name
          <input name="name" required maxLength={200} className={fieldCls} />
        </label>
        <label className={labelCls}>
          Buy URL
          <input name="buyUrl" type="url" required className={fieldCls} />
        </label>
        <label className={labelCls}>
          Alt text (accessibility)
          <input name="altText" required maxLength={300} className={fieldCls} />
        </label>
        <label className={labelCls}>
          Price in cents (optional)
          <input name="priceCents" inputMode="numeric" placeholder="2499" className={fieldCls} />
        </label>
        <label className={labelCls}>
          Currency (optional)
          <input name="currency" maxLength={3} placeholder="USD" className={fieldCls} />
        </label>
        {collections.length > 0 && (
          <label className={labelCls}>
            Collection (optional)
            <select name="collectionId" defaultValue="" className={fieldCls}>
              <option value="">— none —</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Image (optional)</span>
        <ImageUploader shopId={shopId} onUploaded={setImageUrl} />
        <input
          name="imageUrl"
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          aria-label="Image URL"
          placeholder="…or paste an image URL"
          className={fieldCls}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 w-fit items-center justify-center rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add product"}
      </button>

      {state && !state.ok && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" aria-live="polite" className="text-sm text-emerald-700 dark:text-emerald-300">
          Product added.
        </p>
      )}
    </form>
  );
}
