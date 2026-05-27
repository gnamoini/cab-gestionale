"use client";

import { dsSurfaceCard, dsZGlobalLoading } from "@/lib/ui/design-system";
import { GLOBAL_LOADING_MESSAGES } from "@/lib/ui/global-loading-messages";

const spinnerSizeClass = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-10 w-10",
} as const;

export type GlobalLoadingSpinnerSize = keyof typeof spinnerSizeClass;

/** Spinner CAB (accent arancione) — standard unico gestionale. */
export function GlobalLoadingSpinner({
  size = "md",
  className = "",
  label = GLOBAL_LOADING_MESSAGES.default,
}: {
  size?: GlobalLoadingSpinnerSize;
  className?: string;
  label?: string;
}) {
  const dim = spinnerSizeClass[size];
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
    >
      <span
        className={`${dim} animate-spin rounded-full border-2 border-[color:color-mix(in_srgb,var(--cab-border)_90%,transparent)] border-t-[var(--cab-primary)]`}
        aria-hidden
      />
    </span>
  );
}

/** Vista loading centrata: spinner + messaggio (inline / gate / card). */
export function GlobalLoadingView({
  message = GLOBAL_LOADING_MESSAGES.default,
  className = "",
  spinnerSize = "lg",
}: {
  message?: string;
  className?: string;
  spinnerSize?: GlobalLoadingSpinnerSize;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`flex flex-col items-center justify-center gap-3 text-center ${className}`}
    >
      <GlobalLoadingSpinner size={spinnerSize} label={message} />
      <p className="max-w-[16rem] text-sm font-medium leading-snug text-[color:var(--cab-text-muted)]">{message}</p>
    </div>
  );
}

/** Overlay full-screen con blur (navigazione, auth, mutation globali). */
export function GlobalLoadingOverlay({
  visible,
  message = GLOBAL_LOADING_MESSAGES.default,
}: {
  visible: boolean;
  message?: string;
}) {
  if (!visible) return null;
  return (
    <div
      className={`pointer-events-auto fixed inset-0 ${dsZGlobalLoading} flex items-center justify-center bg-[color:color-mix(in_srgb,var(--cab-bg-app)_78%,transparent)] px-4 backdrop-blur-[2px]`}
      aria-hidden={false}
    >
      <div
        className={`${dsSurfaceCard} border-[color:color-mix(in_srgb,var(--cab-border)_70%,var(--cab-border-strong))] px-8 py-7 shadow-[var(--cab-shadow-md)] ring-1 ring-[color:color-mix(in_srgb,var(--cab-border)_40%,transparent)]`}
        role="presentation"
      >
        <GlobalLoadingView message={message} />
      </div>
    </div>
  );
}

/** Fallback Suspense pagina (affianca skeleton esistenti). */
export function GlobalLoadingPageFallback({
  message = GLOBAL_LOADING_MESSAGES.page,
}: {
  message?: string;
}) {
  return (
    <div className="flex min-h-[12rem] items-center justify-center p-6">
      <GlobalLoadingView message={message} />
    </div>
  );
}
