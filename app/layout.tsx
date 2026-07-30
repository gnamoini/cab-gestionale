import Script from "next/script";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/components/app-providers";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import {
  CAB_THEME_STORAGE_KEY,
  resolveServerThemeMode,
} from "@/lib/theme/cab-theme-storage";
import {
  CAB_THEME_BOOT_INLINE_SCRIPT,
  CAB_THEME_CRITICAL_INLINE_STYLE,
} from "@/lib/theme/theme-boot-inline-script";
import { CAB_BRANDING_BOOT_INLINE_SCRIPT } from "@/lib/theme/branding-boot-inline-script";
import { CAB_CURSOR_AUTOMATION_DOM_SHIELD_INLINE_SCRIPT } from "@/lib/theme/cursor-automation-dom-shield-inline-script";
import { CAB_TURBOPACK_CSS_HMR_RECOVERY_INLINE_SCRIPT } from "@/lib/theme/turbopack-css-hmr-recovery-inline-script";
import { lazyLogBootServer } from "@/lib/observability/boot-investigation-lazy";
import "./globals-core.css";

export { siteMetadata as metadata } from "@/lib/site/site-metadata";
export { siteViewport as viewport } from "@/lib/site/site-viewport";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialAuthSnapshot = await getServerSession();
  const cookieStore = await cookies();
  const serverTheme = resolveServerThemeMode(cookieStore.get(CAB_THEME_STORAGE_KEY)?.value);

  lazyLogBootServer("BOOT", "rsc_root_layout", {
    hasUser: Boolean(initialAuthSnapshot?.user?.id),
    userId: initialAuthSnapshot?.user?.id ?? null,
    sessionExpiresAt: initialAuthSnapshot?.session?.expiresAt ?? null,
    configurationError: initialAuthSnapshot?.configurationError ?? null,
  });

  return (
    <html
      lang="it"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full min-h-[var(--cab-app-height,100dvh)] w-full min-w-0 max-w-full bg-[var(--cab-bg-app)] antialiased${serverTheme === "dark" ? " dark" : ""}`}
      style={{ colorScheme: serverTheme }}
    >
      <head suppressHydrationWarning>
        <style
          id="cab-theme-critical"
          dangerouslySetInnerHTML={{ __html: CAB_THEME_CRITICAL_INLINE_STYLE }}
        />
        <Script
          id="cab-theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: CAB_THEME_BOOT_INLINE_SCRIPT }}
        />
        <Script
          id="cab-branding-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: CAB_BRANDING_BOOT_INLINE_SCRIPT }}
        />
        {process.env.NODE_ENV === "development" ? (
          <>
            <script
              id="cab-turbopack-css-hmr-recovery"
              dangerouslySetInnerHTML={{ __html: CAB_TURBOPACK_CSS_HMR_RECOVERY_INLINE_SCRIPT }}
            />
            <Script
              id="cab-cursor-automation-dom-shield"
              strategy="beforeInteractive"
              dangerouslySetInnerHTML={{ __html: CAB_CURSOR_AUTOMATION_DOM_SHIELD_INLINE_SCRIPT }}
            />
          </>
        ) : null}
      </head>
      <body
        suppressHydrationWarning
        className="gestionale-scrollbar flex h-[var(--cab-app-height,100dvh)] min-h-[var(--cab-app-height,100dvh)] w-full min-w-0 max-w-full flex-col overflow-x-hidden bg-[var(--cab-bg-app)] font-sans antialiased"
      >
        <AppProviders initialAuthSnapshot={initialAuthSnapshot}>{children}</AppProviders>
      </body>
    </html>
  );
}
