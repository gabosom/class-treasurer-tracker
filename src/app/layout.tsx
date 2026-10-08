import type { Metadata } from "next";
import "./globals.css";
import { getLang } from "@/lib/request";

export const metadata: Metadata = {
  title: "Tesorería de la clase",
  description: "Fondos, eventos y gastos de la clase 2026-27",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
