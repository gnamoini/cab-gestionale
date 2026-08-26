"use client";

import { useEffect } from "react";
import { APP_PAGE_TITLE_BRAND, APP_PAGE_TITLE_SEPARATOR } from "@/lib/site/app-page-metadata";
import { Geist, Geist_Mono } from "next/font/google";
import { GlobalErrorView } from "@/components/observability/global-error-view";
import { DEFAULT_PERSISTED_THEME_MODE } from "@/lib/theme/user-theme-prefs";
import {
  CAB_THEME_CRITICAL_INLINE_STYLE,
} from "@/lib/theme/theme-boot-inline-script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const defaultTheme = DEFAULT_PERSISTED_THEME_MODE;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    try {
      void import("@/lib/observability/logger").then(({ gestionaleLogger }) => {
        gestionaleLogger.error("next.error_boundary", {
          operation: "system",
          meta: { message: error.message, digest: error.digest, scope: "global" },
        });
      });
    } catch {
      /* logger non disponibile in stato di crash */
    }
  }, [error]);

  return (
    <html
      lang="it"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full min-h-[var(--cab-app-height,100dvh)] w-full min-w-full bg-[var(--cab-bg-app)] antialiased${defaultTheme === "dark" ? " dark" : ""}`}
      style={{ colorScheme: defaultTheme }}
    >
      <head suppressHydrationWarning>
        <title>{`Errore${APP_PAGE_TITLE_SEPARATOR}${APP_PAGE_TITLE_BRAND}`}</title>
        <style
          id="cab-theme-critical"
          dangerouslySetInnerHTML={{ __html: CAB_THEME_CRITICAL_INLINE_STYLE }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="gestionale-scrollbar min-h-[var(--cab-app-height,100dvh)] w-full min-w-full overflow-x-hidden bg-[var(--cab-bg-app)] font-sans text-[color:var(--cab-text)] antialiased"
      >
        <GlobalErrorView message={error.message} digest={error.digest} onRetry={() => reset()} />
      </body>
    </html>
  );
}
