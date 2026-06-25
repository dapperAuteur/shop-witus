import Link from "next/link";

// WitUS ecosystem footer for shop.witus.online. Mirrors the canonical
// structure (fly-witus/src/components/site-footer.tsx via witus-online's
// footer-recipe.md): sibling products, Rise Wellness callout, partner +
// legal links, B4C attribution. Styling uses Shop.WitUS's emerald accent +
// plain zinc palette instead of the reference sky tokens.
//
// The Rise Wellness copy is byte-identical across the ecosystem — only the
// app-name token differs (two spots). Keep SIBLING_PRODUCTS in sync with
// gemini/witus/lib/products.ts when the ecosystem changes.

interface SiblingProduct {
  name: string;
  href: string;
}

const SIBLING_PRODUCTS: SiblingProduct[] = [
  { name: "WitUS.online", href: "https://witus.online" },
  { name: "CentenarianOS", href: "https://centenarianos.com" },
  { name: "Work.WitUS", href: "https://work.witus.online" },
  { name: "Tour Manager OS", href: "https://tour.witus.online" },
  { name: "Wanderlearn", href: "https://wanderlearn.witus.online" },
  { name: "FlashLearnAI", href: "https://flashlearnai.witus.online" },
  { name: "Learn.WitUS", href: "https://centenarianos.com/academy" },
  { name: "AwesomeWebStore", href: "https://awesomewebstore.com" },
];

const linkClasses =
  "inline-flex items-center min-h-[28px] text-zinc-500 dark:text-zinc-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:underline transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 rounded";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-black/10 bg-zinc-50 text-zinc-900 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-100">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <p className="font-mono text-sm font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            Shop.WitUS
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Embeddable shop for any site
          </p>
        </div>

        <RiseWellnessCallout />

        <div className="grid grid-cols-1 gap-8 text-sm sm:grid-cols-3">
          <div>
            <p className="mb-2 font-semibold text-zinc-900 dark:text-zinc-100">Ecosystem</p>
            <ul className="space-y-1">
              {SIBLING_PRODUCTS.map((p) => (
                <li key={p.href}>
                  <a href={p.href} target="_blank" rel="noopener noreferrer" className={linkClasses}>
                    {p.name}
                    <span className="sr-only"> (opens in new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-2 font-semibold text-zinc-900 dark:text-zinc-100">Shop.WitUS</p>
            <ul className="space-y-1">
              <li>
                <Link href="/" className={linkClasses}>
                  Home
                </Link>
              </li>
              <li>
                <Link href="/sign-in" className={linkClasses}>
                  Sign in
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-2 font-semibold text-zinc-900 dark:text-zinc-100">Partners &amp; Legal</p>
            <ul className="space-y-1">
              <li>
                <a
                  href="https://www.centenarianos.com/safety#rise-wellness"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClasses}
                >
                  Rise Wellness
                  <span className="sr-only"> (wellness partner — opens in new tab)</span>
                </a>
                <p className="text-xs leading-tight text-zinc-500 dark:text-zinc-400">
                  Wellness partner
                </p>
              </li>
              <li className="pt-2">
                <a
                  href="https://witus.online/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClasses}
                >
                  Terms
                </a>
              </li>
              <li>
                <a
                  href="https://witus.online/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClasses}
                >
                  Privacy
                </a>
              </li>
              <li>
                <a href="mailto:bam@awews.com" className={linkClasses}>
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-black/10 pt-6 text-center text-xs text-zinc-500 dark:border-white/15 dark:text-zinc-400">
          <p>
            © {year} B4C LLC — A{" "}
            <a
              href="https://awesomewebstore.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-700 hover:underline dark:hover:text-emerald-400"
            >
              AwesomeWebStore.com
              <span className="sr-only"> (opens in new tab)</span>
            </a>{" "}
            brand
          </p>
        </div>
      </div>
    </footer>
  );
}

/**
 * Mental-health support callout — mirrors the Rise Wellness section at
 * centenarianos.com/safety#rise-wellness so the same partner surface appears
 * across the WitUS ecosystem. Independent provider; the non-affiliation
 * disclaimer is mandatory and stays verbatim (only the app-name token changes).
 */
function RiseWellnessCallout() {
  return (
    <section
      aria-labelledby="rise-wellness-heading"
      className="mb-8 rounded-lg border border-emerald-100 bg-emerald-50/60 p-5 text-sm dark:border-emerald-900 dark:bg-emerald-950/30"
    >
      <header className="mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          Mental health support
        </p>
        <h2 id="rise-wellness-heading" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Rise Wellness of Indiana
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Independent mental health provider · Not affiliated with Shop.WitUS
        </p>
      </header>

      <p className="leading-relaxed text-zinc-600 dark:text-zinc-300">
        Rise Wellness of Indiana provides compassionate, personalized, holistic mental health care —
        evidence-based medicine, trauma-informed care, and a whole-person approach to help you heal,
        grow, and thrive in mind, body, and spirit.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Services
          </p>
          <ul className="space-y-0.5 text-xs text-zinc-600 dark:text-zinc-300">
            <li>ADHD testing &amp; management (in-person and from home)</li>
            <li>Anxiety &amp; depression</li>
            <li>Maternal mental health</li>
            <li>Medication management</li>
            <li>GeneSight® genetic testing</li>
            <li>Behavioral therapy &amp; coaching</li>
            <li>Routine lab testing</li>
          </ul>
        </div>

        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Visit or call
          </p>
          <address className="text-xs not-italic leading-relaxed text-zinc-600 dark:text-zinc-300">
            320 North Meridian Street
            <br />
            Indianapolis, IN 46204
            <br />
            Mon–Sat by appointment · Sun closed
          </address>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs">
            <a
              href="tel:+13179650299"
              className="inline-flex min-h-[28px] items-center rounded font-medium text-emerald-700 hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:text-emerald-400"
            >
              317-965-0299
            </a>
            <span aria-hidden="true" className="text-zinc-400">
              ·
            </span>
            <a
              href="https://risewellnessofindiana.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[28px] items-center rounded font-medium text-emerald-700 hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:text-emerald-400"
            >
              risewellnessofindiana.com
              <span className="sr-only"> (opens in new tab)</span>
            </a>
            <span aria-hidden="true" className="text-zinc-400">
              ·
            </span>
            <a
              href="https://www.centenarianos.com/safety#rise-wellness"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[28px] items-center rounded font-medium text-emerald-700 hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:text-emerald-400"
            >
              Full safety page
              <span className="sr-only"> on centenarianos.com (opens in new tab)</span>
            </a>
          </div>
        </div>
      </div>

      <blockquote className="mt-4 border-l-2 border-emerald-300 pl-3 text-xs italic text-zinc-600 dark:text-zinc-300">
        &ldquo;At Rise Wellness, we believe everyone has the capacity to rise above challenges and
        live a fulfilling, healthy life. Our care is guided by the belief that healing is personal,
        holistic, and rooted in compassion.&rdquo;
        <span className="mt-1 block not-italic text-zinc-500 dark:text-zinc-400">
          — Rise Wellness of Indiana
        </span>
      </blockquote>

      <p className="mt-4 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
        Rise Wellness of Indiana is an independent organization. They are not affiliated with,
        employed by, or endorsed by Shop.WitUS, CentenarianOS, B4C LLC, AwesomeWebStore.com, or
        Anthony McDonald. We are grateful for their collaboration on mental health safety resources
        for our community.
      </p>
    </section>
  );
}
