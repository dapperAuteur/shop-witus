import { listUserShops, requireUser } from "@/lib/rbac";
import { SignOutButton } from "./sign-out-button";

export default async function DashboardPage() {
  const user = await requireUser();
  const shops = await listUserShops(user.id);

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-sm font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            Shop.WitUS
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Your shops</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Signed in as {user.email}
          </p>
        </div>
        <SignOutButton />
      </header>

      <section aria-label="Shops" className="mt-8 flex flex-col gap-3">
        {shops.length === 0 ? (
          <p className="rounded-lg border border-black/10 p-5 text-zinc-600 dark:border-white/15 dark:text-zinc-300">
            No shop yet — it&apos;s created automatically on first sign-in. If you&apos;re seeing
            this, refresh in a moment.
          </p>
        ) : (
          shops.map((shop) => (
            <div
              key={shop.shopId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-black/10 p-5 dark:border-white/15"
            >
              <div>
                <h2 className="text-lg font-semibold">{shop.name}</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  <span className="font-mono">/{shop.slug}</span> · {shop.role}
                </p>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Catalog &amp; embed coming in Phase 2–3
              </p>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
