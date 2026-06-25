"use client";

// Iframe-friendly error state for the public widget — quiet, no app chrome.
export default function EmbedError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif",
        padding: 24,
        fontSize: 14,
        color: "#71717a",
      }}
    >
      This shop couldn’t load right now.{" "}
      <button
        type="button"
        onClick={reset}
        style={{
          textDecoration: "underline",
          background: "none",
          border: 0,
          color: "inherit",
          cursor: "pointer",
          font: "inherit",
          padding: 0,
        }}
      >
        Retry
      </button>
    </div>
  );
}
