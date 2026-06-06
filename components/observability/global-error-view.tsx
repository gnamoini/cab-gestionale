"use client";

import { AuthStandalonePageShell } from "@/components/gestionale/auth-standalone-page";
import { ErrorPageCard } from "@/components/observability/error-page-card";
import {
  buildTechnicalDetail,
  friendlyDescription,
} from "@/lib/observability/error-message-humanize";

/** Vista errore root — nessun hook che richiede provider (router, auth, theme). */
export function GlobalErrorView({
  message,
  digest,
  onRetry,
}: {
  message?: string;
  digest?: string;
  onRetry?: () => void;
}) {
  const description = friendlyDescription("global", message);
  const technicalDetail = buildTechnicalDetail(message, digest);

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.assign("/");
  };

  return (
    <AuthStandalonePageShell showThemeToggle={false} decorativeBackground={false}>
      <main className="relative z-10 flex min-h-[var(--cab-app-height,100dvh)] w-full flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
        <ErrorPageCard
          eyebrow="Errore di caricamento"
          title="Errore di caricamento"
          description={description}
          technicalDetail={technicalDetail}
          onRetry={onRetry}
          onBack={goBack}
          safeExitHref="/"
          safeExitLabel="Torna alla home"
          safeExitReady
        />
      </main>
    </AuthStandalonePageShell>
  );
}
