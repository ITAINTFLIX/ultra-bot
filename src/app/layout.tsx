import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";

const inter = Inter({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Ultra Bot — Cloud MT5 Gold Scalper",
  description:
    "Self-serve cloud MT5 bridge gold scalper. Connect your Exness account. Aggressive multi-position baskets. Experimental — no profit guarantees.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Nav />
        <main className="mx-auto min-h-[calc(100vh-57px)] max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t border-[var(--border)] py-6 text-center text-xs text-slate-500">
          Ultra Bot · Self-serve MT5 · Experimental · No profit guarantees · Trade at your own risk
        </footer>
      </body>
    </html>
  );
}
