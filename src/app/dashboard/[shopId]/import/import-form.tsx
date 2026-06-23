"use client";

import { useActionState } from "react";
import { importProductsCsv } from "@/lib/actions/catalog";

type ImportResult = Awaited<ReturnType<typeof importProductsCsv>>;

export function ImportForm({ shopId }: { shopId: string }) {
  const [state, action, pending] = useActionState<ImportResult | null, FormData>(
    async (_prev, formData) => importProductsCsv(formData),
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="shopId" value={shopId} />
      <div className="flex flex-col gap-2">
        <label htmlFor="file" className="text-sm font-medium">
          CSV file
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="min-h-11 rounded-md border border-black/15 bg-transparent px-3 py-2 text-base file:mr-3 file:rounded file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:border-white/20"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 w-fit items-center justify-center rounded-md bg-emerald-600 px-6 text-base font-semibold text-white hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-60"
      >
        {pending ? "Importing…" : "Import"}
      </button>

      {state && !state.ok && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      {state?.ok && (
        <div role="status" aria-live="polite" className="flex flex-col gap-2">
          <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-200">
            Imported {state.data.imported} product{state.data.imported === 1 ? "" : "s"}.
            {state.data.skipped.length > 0 ? ` Skipped ${state.data.skipped.length}.` : ""}
          </p>
          {state.data.skipped.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-300">
              {state.data.skipped.map((s, i) => (
                <li key={i}>
                  {s.row > 0 ? `Row ${s.row}: ` : ""}
                  {s.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
