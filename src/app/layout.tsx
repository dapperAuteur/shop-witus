import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shop.WitUS — your products, embeddable anywhere",
  description:
    "Self-service embeddable product catalog. Import your best sellers, drop a shoppable widget into any site, and route every click to your store.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-white text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-50">
        {children}
      </body>
    </html>
  );
}
