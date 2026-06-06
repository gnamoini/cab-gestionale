"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AuthStandalonePageShell,
} from "@/components/gestionale/auth-standalone-page";
import { ErrorPageCard } from "@/components/observability/error-page-card";
import {
  useAccessibleQuickNavLinks,
  useSafeGestionaleHomeLink,
} from "@/components/observability/use-safe-gestionale-home-link";
import {
  buildTechnicalDetail,
  friendlyDescription,
} from "@/lib/observability/error-message-humanize";
import { dsFocus } from "@/lib/ui/design-system";

export type GestionaleErrorFallbackProps = {
  variant: "root" | "gestionale" | "global";
  message?: string;
  digest?: string;
  onRetry?: () => void;
};

function QuickNavLinks() {
  const { links, ready } = useAccessibleQuickNavLinks({ max: 3 });

  if (!ready || links.length === 0) return null;

  return (
    <>
      <p className="text-xs font-medium text-[color:var(--cab-text-muted)]">Collegamenti rapidi</p>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={`text-sm font-medium text-[color:var(--cab-primary)] underline-offset-2 hover:underline ${dsFocus}`}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function GestionaleEmbeddedError({
  description,
  technicalDetail,
  onRetry,
}: {
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
    <div className="flex min-h-[min(28rem,60vh)] min-w-0 flex-col items-center justify-center px-2 py-8 sm:py-12">
      <ErrorPageCard
        eyebrow="Errore di caricamento"
        title="Impossibile caricare la pagina"
        description={description}
        technicalDetail={technicalDetail}
        showLogo={false}
        onRetry={onRetry}
        onBack={goBack}
        safeExitHref={safeHome.href}
        safeExitLabel={safeHome.label}
        safeExitReady={safeHome.ready}
        footer={<QuickNavLinks />}
      />
    </div>
  );
}

function GlobalStandaloneErrorPage({
  eyebrow,
  title,
  description,
  technicalDetail,
  onRetry,
  safeExitHref,
  safeExitLabel,
}: {
  eyebrow: string;
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
    <AuthStandalonePageShell showThemeToggle={false}>
      <main className="relative z-10 flex min-h-[var(--cab-app-height,100dvh)] w-full flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
        <ErrorPageCard
          eyebrow={eyebrow}
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
  eyebrow,
  title,
  description,
  technicalDetail,
  onRetry,
  safeExitHref,
  safeExitLabel,
}: {
  eyebrow: string;
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
    <AuthStandalonePageShell showThemeToggle={false}>
      <main className="relative z-10 flex min-h-[var(--cab-app-height,100dvh)] w-full flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
        <ErrorPageCard
          eyebrow={eyebrow}
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
  const description = friendlyDescription(variant, raw);
  const technicalDetail = buildTechnicalDetail(raw, digest);

  if (variant === "gestionale") {
    return (
      <GestionaleEmbeddedError
        description={description}
        technicalDetail={technicalDetail}
        onRetry={onRetry}
      />
    );
  }

  if (variant === "global") {
    return (
      <GlobalStandaloneErrorPage
        eyebrow="Errore imprevisto"
        title="Impossibile caricare l'applicazione"
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
      eyebrow="Errore imprevisto"
      title="Qualcosa è andato storto"
      description={description}
      technicalDetail={technicalDetail}
      onRetry={onRetry}
      safeExitHref="/"
      safeExitLabel="Torna alla home"
    />
  );
}
