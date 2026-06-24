# Embedding a Shop.WitUS widget

Your shop is a single line of HTML you can paste into any website or WitUS app. Clicks open your store in a new tab — Shop.WitUS never handles checkout.

Generate your exact snippet (with theme/layout options) in the dashboard: **Shop → Embed your shop**. It looks like this:

```html
<iframe data-shopwitus
  src="https://shop.witus.online/embed/shop/YOUR-SHOP/YOUR-COLLECTION"
  title="Shop" loading="lazy" style="width:100%;height:600px;border:0"></iframe>
<script>
window.addEventListener("message",function(e){
  if(!e.data||e.data.type!=="shopwitus:height"||typeof e.data.height!=="number")return;
  document.querySelectorAll("iframe[data-shopwitus]").forEach(function(f){
    if(f.contentWindow===e.source)f.style.height=e.data.height+"px";
  });
});
</script>
```

The `<script>` auto-sizes the iframe to the widget's content height (via a `postMessage` handshake). If a platform strips inline scripts, the plain `<iframe>` still works — it just keeps the fixed `height` and scrolls inside it.

## URL options (query params)

| Param | Values | Default |
|---|---|---|
| `theme` | `light`, `dark` | `light` |
| `layout` | `grid`, `list` | `grid` |
| `hidechrome` | `1` | off (shows "Powered by Shop.WitUS") |
| `accent` | a `#rrggbb` hex | your shop's accent color |

## Per-platform steps

### Wix (recommended for Wix merchants)
1. In the Wix editor: **Add (+) → Embed Code → Embed HTML**.
2. Click **Enter Code** and paste the snippet.
3. **Update**, then resize/position the box. Publish.

> Wix HTML embeds run in their own iframe; the auto-resize script works there. If your products are taller than the box, drag it taller or rely on the inner scroll.

### Squarespace
**Edit a section → Add Block → Code** → paste → Apply.

### WordPress (block editor)
Add a **Custom HTML** block → paste → Update.

### Webflow / Weebly / plain HTML
Drop an **Embed / Custom HTML** element (or paste directly into your page's HTML) → paste the snippet.

### React / Next.js (another WitUS app, e.g. a Wanderlearn tour)
Render the iframe directly; add the resize listener in a small client effect, or wrap with a fixed aspect container.

```tsx
<iframe
  src="https://shop.witus.online/embed/shop/YOUR-SHOP/YOUR-COLLECTION?theme=dark"
  title="Shop"
  loading="lazy"
  style={{ width: "100%", height: 600, border: 0 }}
/>
```

## Notes
- Only **published** collections and **active** products appear. Drafts and hidden items never render.
- The widget is server-rendered and works once loaded even if the visitor goes offline (the external store link just won't resolve without a connection).
