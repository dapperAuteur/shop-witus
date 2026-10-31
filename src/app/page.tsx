import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getSession } from "@/lib/rbac";

export default async function HomePage() {
  // A failed lookup falls back to signed out, so the header shows "Sign in" instead of nothing.
  const session = await getSession().catch(() => null);
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader signedIn={Boolean(session)} />
      <main
        id="main"
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-16"
      >
        <p className="font-mono text-sm font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
          Shop.WitUS
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Your products, embeddable anywhere.
        </h1>
        <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-300">
          Import your best sellers once — by CSV or by connecting your store — and drop a shoppable
          widget into any website or WitUS app. Every click routes to your store.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/sign-in"
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-emerald-700 px-6 text-base font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            Get started
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
