import type { Metadata } from "next";
import { headers } from "next/headers";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import { isLocale } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SIFAP — Modern platform", template: "%s | SIFAP" },
  description: "A multilingual, read-only SIFAP modernization workshop.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const value = (await headers()).get("x-sifap-locale") ?? "pt-BR";
  const locale = isLocale(value) ? value : "pt-BR";
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
