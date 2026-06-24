"use client";

import { useEffect } from "react";

// Tells the host page how tall the widget is so the iframe can auto-size.
// The host listens for { type: "shopwitus:height", height } (see the snippet
// in docs/EMBED_SHOP.md) and sets the iframe height to match.
export function EmbedResizer() {
  useEffect(() => {
    const post = () => {
      const height = Math.ceil(document.documentElement.scrollHeight);
      window.parent?.postMessage({ type: "shopwitus:height", height }, "*");
    };
    post();
    const ro = new ResizeObserver(() => post());
    ro.observe(document.documentElement);
    window.addEventListener("load", post);
    return () => {
      ro.disconnect();
      window.removeEventListener("load", post);
    };
  }, []);

  return null;
}
