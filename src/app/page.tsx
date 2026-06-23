export default function HomePage() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center gap-6 px-4 py-16"
    >
      <p className="font-mono text-sm font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
        Shop.WitUS
      </p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Your products, embeddable anywhere.
      </h1>
      <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-300">
        Import your best sellers once — by CSV or by connecting your Wix store — and drop a
        shoppable widget into any website or WitUS app. Every click routes to your store.
      </p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Scaffold in progress · Phase 0.
      </p>
    </main>
  );
}
