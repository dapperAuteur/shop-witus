// Shared money formatter. Returns null when there's no price so callers can
// omit the line entirely.
export function formatPrice(cents: number | null, currency: string | null): string | null {
  if (cents == null) return null;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency ?? "USD",
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency ?? ""}`.trim();
  }
}
