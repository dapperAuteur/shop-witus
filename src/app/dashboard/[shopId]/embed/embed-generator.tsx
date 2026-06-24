"use client";

import { useMemo, useState } from "react";

interface CollectionOpt {
  slug: string;
  name: string;
}

const labelCls = "flex flex-col gap-1 text-sm font-medium";
const fieldCls =
  "min-h-11 rounded-md border border-black/15 bg-transparent px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:border-white/20";

export function EmbedGenerator({
  shopSlug,
  collections,
}: {
  shopSlug: string;
  collections: CollectionOpt[];
}) {
  const [collectionSlug, setCollectionSlug] = useState(collections[0]?.slug ?? "");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [hideChrome, setHideChrome] = useState(false);
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const url = useMemo(() => {
    if (!origin || !collectionSlug) return "";
    const u = new URL(`${origin}/embed/shop/${shopSlug}/${collectionSlug}`);
    if (theme !== "light") u.searchParams.set("theme", theme);
    if (layout !== "grid") u.searchParams.set("layout", layout);
    if (hideChrome) u.searchParams.set("hidechrome", "1");
    return u.toString();
  }, [origin, shopSlug, collectionSlug, theme, layout, hideChrome]);

  const snippet = useMemo(
    () =>
      `<iframe data-shopwitus src="${url}" title="Shop" loading="lazy" style="width:100%;height:600px;border:0"></iframe>
<script>
window.addEventListener("message",function(e){
  if(!e.data||e.data.type!=="shopwitus:height"||typeof e.data.height!=="number")return;
  document.querySelectorAll("iframe[data-shopwitus]").forEach(function(f){
    if(f.contentWindow===e.source)f.style.height=e.data.height+"px";
  });
});
</script>`,
    [url],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (collections.length === 0) {
    return (
      <p className="rounded-lg border border-black/10 p-4 text-sm text-zinc-600 dark:border-white/15 dark:text-zinc-300">
        Publish a collection first — then come back here for its embed code.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelCls}>
          Collection
          <select
            value={collectionSlug}
            onChange={(e) => setCollectionSlug(e.target.value)}
            className={fieldCls}
          >
            {collections.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          Theme
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as "light" | "dark")}
            className={fieldCls}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label className={labelCls}>
          Layout
          <select
            value={layout}
            onChange={(e) => setLayout(e.target.value as "grid" | "list")}
            className={fieldCls}
          >
            <option value="grid">Grid</option>
            <option value="list">List</option>
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={hideChrome}
            onChange={(e) => setHideChrome(e.target.checked)}
            className="size-4"
          />
          Hide “Powered by” footer
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Embed code</span>
          <button
            type="button"
            onClick={copy}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-black/15 px-3 text-sm font-medium hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:border-white/20 dark:hover:bg-white/5"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <textarea
          readOnly
          value={snippet}
          rows={9}
          aria-label="Embed code"
          className="w-full rounded-md border border-black/15 bg-transparent p-3 font-mono text-xs dark:border-white/20"
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Paste into any site or WitUS app. The small script auto-sizes the iframe to fit; without it
          the widget just scrolls inside the fixed height.
        </p>
      </div>

      {url && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Preview</span>
          <iframe
            key={url}
            src={url}
            title="Shop preview"
            style={{ height: 600 }}
            className="w-full rounded-md border border-black/10 dark:border-white/15"
          />
        </div>
      )}
    </div>
  );
}
