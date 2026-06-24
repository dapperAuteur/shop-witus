// Iframe-friendly 404 for the public widget — a quiet message rather than a
// full app chrome / stack trace when a shop or collection isn't available.
export default function EmbedNotFound() {
  return (
    <div
      style={{
        fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif",
        padding: 24,
        color: "#71717a",
        fontSize: 14,
      }}
    >
      This shop or collection isn’t available.
    </div>
  );
}
