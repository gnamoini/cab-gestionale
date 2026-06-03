import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/components/app-providers";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import { CAB_THEME_BOOT_INLINE_SCRIPT } from "@/lib/theme/theme-boot-inline-script";
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
  title: "CAB Gestionale Officina",
  description:
    "Gestionale web per officina: magazzino ricambi, lavorazioni, ERP/CRM, report e documentale.",
  icons: {
    icon: "/cab-logo.png",
    apple: "/cab-logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialAuthSnapshot = await getServerSession();

  return (
    <html
      lang="it"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full min-h-[var(--cab-app-height,100dvh)] w-full min-w-full bg-[var(--cab-bg-app)] antialiased`}
    >
      <head suppressHydrationWarning>
        <Script
          id="cab-theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: CAB_THEME_BOOT_INLINE_SCRIPT }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="gestionale-scrollbar flex h-[var(--cab-app-height,100dvh)] min-h-[var(--cab-app-height,100dvh)] w-full min-w-full flex-col overflow-x-hidden bg-[var(--cab-bg-app)] font-sans antialiased"
      >
        <AppProviders initialAuthSnapshot={initialAuthSnapshot}>{children}</AppProviders>
      </body>
    </html>
  );
}
