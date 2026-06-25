import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Help & FAQ — Shop.WitUS",
  description: "How to set up your shop: import products, organize collections, publish, and embed.",
};

const steps = [
  {
    title: "Sign in",
    body: "Enter your email and click the magic link we send. Your shop is created automatically on first sign-in — no setup, no approval.",
  },
  {
    title: "Add your products",
    body: "Two ways: upload a CSV of your best sellers, or connect your Wix store and import. Re-importing updates existing items in place (no duplicates).",
  },
  {
    title: "Organize into collections",
    body: "Group products into collections like “Best Sellers” or “Gifts.” In a CSV, the optional collection column creates them for you.",
  },
  {
    title: "Publish a collection",
    body: "Only published collections appear in your widget. You can’t publish a collection until it has at least one active product.",
  },
  {
    title: "Embed it anywhere",
    body: "Open Embed, pick a collection and theme, copy the snippet, and paste it on any website or WitUS app. Every product click opens your store in a new tab — we never handle checkout.",
  },
];

const faqs = [
  {
    q: "My widget is empty or not showing products.",
    a: "The collection must be Published and have at least one Active product. Draft collections and hidden products never render in the widget.",
  },
  {
    q: "How do I update prices or products?",
    a: "Re-upload your CSV (items are matched by SKU, or by name when there’s no SKU) or re-import from Wix. Existing items update in place — no duplicates.",
  },
  {
    q: "What’s the CSV format?",
    a: "Required columns: name, buy_url, alt_text. Optional: price_cents (in cents, e.g. 2499 = $24.99), currency, image_url, sku, collection, sort_order. Up to 500 rows / 1 MB.",
  },
  {
    q: "Where do product clicks go?",
    a: "To your own store — the buy_url for each product, opened in a new tab. Shop.WitUS is a showcase that links out; it never processes payments or checkout.",
  },
  {
    q: "Can I match my site’s look?",
    a: "Yes. In the Embed generator you can set light/dark theme, grid/list layout, hide the “Powered by” footer, and your accent color carries through.",
  },
  {
    q: "Does it work on Wix, Squarespace, WordPress…?",
    a: "Yes — paste the snippet into an Embed/HTML block. On Wix: Add → Embed Code → Embed HTML → paste. The included script auto-sizes the iframe to fit.",
  },
];

const linkCls =
  "text-emerald-700 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:text-emerald-300";

export default function HelpPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <p className="font-mono text-sm font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
          Shop.WitUS
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Help &amp; FAQ</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-300">
          Set up a shoppable widget in minutes, then embed it anywhere.
        </p>

        <section aria-labelledby="getting-started" className="mt-10">
          <h2 id="getting-started" className="text-xl font-semibold tracking-tight">
            Getting started
          </h2>
          <ol className="mt-4 flex flex-col gap-4">
            {steps.map((step, i) => (
              <li
                key={step.title}
                className="rounded-lg border border-black/10 p-5 dark:border-white/15"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-sm text-zinc-500 dark:text-zinc-400">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                </div>
                <p className="mt-2 text-base leading-7 text-zinc-700 dark:text-zinc-200">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
            Tip:{" "}
            <a href="/templates/shop-witus-template.csv" download className={linkCls}>
              download the CSV template
            </a>{" "}
            to start from the right columns.
          </p>
        </section>

        <section aria-labelledby="faq" className="mt-12">
          <h2 id="faq" className="text-xl font-semibold tracking-tight">
            FAQ
          </h2>
          <div className="mt-4 flex flex-col gap-2">
            {faqs.map((item) => (
              <details
                key={item.q}
                className="rounded-lg border border-black/10 p-4 dark:border-white/15"
              >
                <summary className="cursor-pointer font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
                  {item.q}
                </summary>
                <p className="mt-2 text-base leading-7 text-zinc-700 dark:text-zinc-200">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="more-help" className="mt-12">
          <h2 id="more-help" className="text-xl font-semibold tracking-tight">
            Still stuck?
          </h2>
          <p className="mt-2 text-base leading-7 text-zinc-700 dark:text-zinc-200">
            Email{" "}
            <a href="mailto:bam@awews.com" className={linkCls}>
              bam@awews.com
            </a>
            . Or head to your{" "}
            <Link href="/dashboard" className={linkCls}>
              dashboard
            </Link>{" "}
            to import products and grab your embed code.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
