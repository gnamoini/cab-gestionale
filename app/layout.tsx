import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/components/app-providers";
import { buildThemeBootInlineScript } from "@/lib/theme/theme-boot-inline-script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CAB — Gestionale manutenzione igiene urbana",
  description:
    "Gestionale web per officina: magazzino ricambi, lavorazioni, ERP/CRM, report e documentale.",
  icons: {
    icon: "/cab-logo.png",
    apple: "/cab-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Blocking boot: unica scrittura su <html> prima di React. Attributi bis_* / chrome-extension sono injection esterna. */}
        <script dangerouslySetInnerHTML={{ __html: buildThemeBootInlineScript() }} />
      </head>
      <body className="gestionale-scrollbar flex min-h-full flex-col font-sans antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
