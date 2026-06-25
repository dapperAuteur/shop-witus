// Pick white or near-black text for the best WCAG contrast on a given hex
// background. The embed widget's Buy button uses this so any merchant accent
// (default #10b981, which fails with white text at ~2.5:1) gets readable text.
export function readableOn(hex: string): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const lin = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const L = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  const whiteContrast = 1.05 / (L + 0.05);
  const blackContrast = (L + 0.05) / 0.05;
  return whiteContrast >= blackContrast ? "#ffffff" : "#111827";
}
