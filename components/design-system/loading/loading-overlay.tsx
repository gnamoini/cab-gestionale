"use client";

import { memo } from "react";
import { dsSurfaceCard, dsZGlobalLoading } from "@/lib/ui/design-system";
import { GLOBAL_LOADING_MESSAGES } from "@/lib/ui/global-loading-messages";
import { LoadingSpinner } from "./loading-spinner";
import { loadingMessageClass } from "./loading-tokens";
import type { LoadingSpinnerSize } from "./loading-tokens";

export type LoadingViewProps = {
  message?: string;
  className?: string;
  spinnerSize?: LoadingSpinnerSize;
};

/** Vista loading centrata: spinner + messaggio (inline / gate / card). */
export const LoadingView = memo(function LoadingView({
  message = GLOBAL_LOADING_MESSAGES.default,
  className = "",
  spinnerSize = "lg",
}: LoadingViewProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`flex min-w-0 flex-col items-center justify-center gap-3 text-center ${className}`.trim()}
    >
      <LoadingSpinner size={spinnerSize} label={message} />
      <p className={`max-w-[16rem] ${loadingMessageClass}`}>{message}</p>
    </div>
  );
});

export type LoadingOverlayProps = {
  visible: boolean;
  message?: string;
};

/** Overlay full-screen con blur (navigazione, auth, mutation globali). */
export const LoadingOverlay = memo(function LoadingOverlay({
  visible,
  message = GLOBAL_LOADING_MESSAGES.default,
}: LoadingOverlayProps) {
  if (!visible) return null;
  return (
    <div
      className={`pointer-events-auto fixed inset-0 ${dsZGlobalLoading} flex min-w-0 items-center justify-center overflow-x-hidden bg-[color:color-mix(in_srgb,var(--cab-bg-app)_78%,transparent)] px-4 backdrop-blur-[2px]`}
      aria-hidden={false}
    >
      <div
        className={`${dsSurfaceCard} border-[color:color-mix(in_srgb,var(--cab-border)_70%,var(--cab-border-strong))] px-8 py-7 shadow-[var(--cab-shadow-md)] ring-1 ring-[color:color-mix(in_srgb,var(--cab-border)_40%,transparent)]`}
        role="presentation"
      >
        <LoadingView message={message} />
      </div>
    </div>
  );
});

export type LoadingPageFallbackProps = {
  message?: string;
};

/** Fallback Suspense pagina. */
export const LoadingPageFallback = memo(function LoadingPageFallback({
  message = GLOBAL_LOADING_MESSAGES.page,
}: LoadingPageFallbackProps) {
  return (
    <div className="flex min-w-0 min-h-[12rem] items-center justify-center p-6" aria-busy="true">
      <LoadingView message={message} />
    </div>
  );
});
