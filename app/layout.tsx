import type { Metadata, Viewport } from "next";
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
  title: "CAB — Gestionale manutenzione igiene urbana",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Blocking boot: tema da localStorage prima di React — non impostare `dark` lato SSR (mismatch). */}
        <script dangerouslySetInnerHTML={{ __html: CAB_THEME_BOOT_INLINE_SCRIPT }} />
      </head>
      <body className="gestionale-scrollbar flex h-dvh min-h-0 flex-col overflow-x-hidden font-sans antialiased">
        <AppProviders initialAuthSnapshot={initialAuthSnapshot}>{children}</AppProviders>
      </body>
    </html>
  );
}
