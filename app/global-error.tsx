"use client";

import { useEffect } from "react";
import Script from "next/script";
import { GestionaleErrorFallback } from "@/components/observability/gestionale-error-fallback";
import { gestionaleLogger } from "@/lib/observability/logger";
import { CAB_THEME_BOOT_INLINE_SCRIPT } from "@/lib/theme/theme-boot-inline-script";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    gestionaleLogger.error("next.error_boundary", {
      operation: "system",
      meta: { message: error.message, digest: error.digest, scope: "global" },
    });
  }, [error]);

  return (
    <html
      lang="it"
      suppressHydrationWarning
      className="h-full min-h-[var(--cab-app-height,100dvh)] w-full min-w-full bg-[var(--cab-bg-app)] antialiased"
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
        className="gestionale-scrollbar flex min-h-[var(--cab-app-height,100dvh)] w-full min-w-full flex-col overflow-x-hidden bg-[var(--cab-bg-app)] font-sans text-[color:var(--cab-text)] antialiased"
      >
        <GestionaleErrorFallback
          variant="global"
          message={error.message}
          digest={error.digest}
          onRetry={() => reset()}
        />
      </body>
    </html>
  );
}
