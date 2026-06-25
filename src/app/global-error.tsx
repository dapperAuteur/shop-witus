"use client";

// Catches errors in the root layout itself, so it must render its own
// <html>/<body>. Inline styles only — Tailwind/layout aren't guaranteed here.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif",
          display: "flex",
          minHeight: "100dvh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: 16,
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ color: "#71717a", fontSize: 14 }}>The app hit an unexpected error.</p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 12,
              minHeight: 44,
              padding: "0 16px",
              border: "1px solid #ccc",
              borderRadius: 6,
              background: "transparent",
              cursor: "pointer",
              font: "inherit",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
