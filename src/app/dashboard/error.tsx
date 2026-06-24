"use client";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main" className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        We couldn&apos;t load this page. If you just set things up, the database may not be reachable
        yet.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md border border-black/15 px-4 text-sm font-medium hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:border-white/20 dark:hover:bg-white/5"
      >
        Try again
      </button>
    </main>
  );
}
