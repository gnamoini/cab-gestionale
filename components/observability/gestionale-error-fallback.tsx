"use client";

import { useRouter } from "next/navigation";
import {
  AuthStandalonePageShell,
} from "@/components/gestionale/auth-standalone-page";
import { ErrorPageCard } from "@/components/observability/error-page-card";
import { useSafeGestionaleHomeLink } from "@/components/observability/use-safe-gestionale-home-link";
import {
  buildTechnicalDetail,
  errorTitle,
  friendlyDescription,
} from "@/lib/observability/error-message-humanize";

export type GestionaleErrorFallbackProps = {
  variant: "root" | "gestionale" | "global";
  message?: string;
  digest?: string;
  onRetry?: () => void;
};

function GestionaleEmbeddedError({
  title,
  description,
  technicalDetail,
  onRetry,
}: {
  title: string;
  description: string;
  technicalDetail?: string;
  onRetry?: () => void;
}) {
  const router = useRouter();
  const safeHome = useSafeGestionaleHomeLink();
  const homeHref = safeHome.ready ? safeHome.href : "/login";

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(homeHref);
  };

  return (
    <div className="flex min-w-0 flex-col items-center justify-center px-2 py-10">
      <ErrorPageCard
        title={title}
        description={description}
        technicalDetail={technicalDetail}
        showLogo={false}
        layout="embedded"
        onRetry={onRetry}
        onBack={goBack}
        safeExitHref={safeHome.href}
        safeExitLabel={safeHome.label}
        safeExitReady={safeHome.ready}
      />
    </div>
  );
}

function GlobalStandaloneErrorPage({
  title,
  description,
  technicalDetail,
  onRetry,
  safeExitHref,
  safeExitLabel,
}: {
  title: string;
  description: string;
  technicalDetail?: string;
  onRetry?: () => void;
  safeExitHref: string;
  safeExitLabel: string;
}) {
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.assign(safeExitHref);
  };

  return (
    <AuthStandalonePageShell showThemeToggle={false} decorativeBackground={false}>
      <main className="relative z-10 flex min-h-[var(--cab-app-height,100dvh)] w-full flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
        <ErrorPageCard
          title={title}
          description={description}
          technicalDetail={technicalDetail}
          onRetry={onRetry}
          onBack={goBack}
          safeExitHref={safeExitHref}
          safeExitLabel={safeExitLabel}
          safeExitReady
        />
      </main>
    </AuthStandalonePageShell>
  );
}

function StandaloneErrorPage({
  title,
  description,
  technicalDetail,
  onRetry,
  safeExitHref,
  safeExitLabel,
}: {
  title: string;
  description: string;
  technicalDetail?: string;
  onRetry?: () => void;
  safeExitHref: string;
  safeExitLabel: string;
}) {
  const router = useRouter();

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(safeExitHref);
  };

  return (
    <AuthStandalonePageShell showThemeToggle={false} decorativeBackground={false}>
      <main className="relative z-10 flex min-h-[var(--cab-app-height,100dvh)] w-full flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
        <ErrorPageCard
          title={title}
          description={description}
          technicalDetail={technicalDetail}
          onRetry={onRetry}
          onBack={goBack}
          safeExitHref={safeExitHref}
          safeExitLabel={safeExitLabel}
          safeExitReady
        />
      </main>
    </AuthStandalonePageShell>
  );
}

export function GestionaleErrorFallback({
  variant,
  message,
  digest,
  onRetry,
}: GestionaleErrorFallbackProps) {
  const raw = message?.trim();
  const title = errorTitle(variant, raw);
  const description = friendlyDescription(variant, raw);
  const technicalDetail = buildTechnicalDetail(raw, digest);

  if (variant === "gestionale") {
    return (
      <GestionaleEmbeddedError
        title={title}
        description={description}
        technicalDetail={technicalDetail}
        onRetry={onRetry}
      />
    );
  }

  if (variant === "global") {
    return (
      <GlobalStandaloneErrorPage
        title={title}
        description={description}
        technicalDetail={technicalDetail}
        onRetry={onRetry}
        safeExitHref="/"
        safeExitLabel="Torna alla home"
      />
    );
  }

  return (
    <StandaloneErrorPage
      title={title}
      description={description}
      technicalDetail={technicalDetail}
      onRetry={onRetry}
      safeExitHref="/"
      safeExitLabel="Torna alla home"
    />
  );
}
