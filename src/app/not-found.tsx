import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getSession } from "@/lib/rbac";

// Error pages keep the app shell (witus docs/shared-ui-ux-dx.md): the root layout has no header,
// so the 404 page renders the header (with Sign in) and the footer itself.
export default async function NotFound() {
  // A failed lookup falls back to signed out, so the header shows "Sign in" instead of nothing.
  const session = await getSession().catch(() => null);
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader signedIn={Boolean(session)} />
      <main
        id="main"
        className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center"
      >
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          That page does not exist or has moved.
        </p>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-emerald-700 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:text-emerald-300"
        >
          Go home
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
