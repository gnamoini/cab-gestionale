"use client";

import { AuthProvider } from "@/context/auth-context";
import { GlobalLoadingProvider } from "@/context/global-loading-context";
import { ThemeProvider } from "@/context/theme-context";
import { ToastProvider } from "@/context/toast-context";
import { GlobalLoadingQueryBridge } from "@/src/components/global-loading-query-bridge";
import { DeferredPwaBridges } from "@/src/components/deferred-pwa-bridges";
import { QueryProvider } from "@/src/providers/query-provider";
import { GestionaleClientErrorBoundary } from "@/components/observability/gestionale-client-error-boundary";
import { BodyScrollLockRouteGuard, BodyScrollLockHealGuard } from "@/lib/ui/use-body-scroll-lock";
import { OverlayBackStackGuard } from "@/lib/ui/overlay-back-stack-guard";
import { IosInteractionStability } from "@/src/components/ios-interaction-stability";
import type { ServerAuthSnapshot } from "@/src/lib/auth/server-auth-types";

/** Provider minimi: login + shell auth (Query, Auth, Theme, loading globale). */
export function AppProvidersCore({
  children,
  initialAuthSnapshot,
}: {
  children: React.ReactNode;
  initialAuthSnapshot?: ServerAuthSnapshot;
}) {
  return (
    <ToastProvider>
      <QueryProvider>
        <GlobalLoadingProvider>
          <GlobalLoadingQueryBridge />
          <AuthProvider initialSnapshot={initialAuthSnapshot}>
            <DeferredPwaBridges />
            <BodyScrollLockRouteGuard />
            <BodyScrollLockHealGuard />
            <OverlayBackStackGuard />
            <IosInteractionStability />
            <GestionaleClientErrorBoundary>
              <ThemeProvider>{children}</ThemeProvider>
            </GestionaleClientErrorBoundary>
          </AuthProvider>
        </GlobalLoadingProvider>
      </QueryProvider>
    </ToastProvider>
  );
}
