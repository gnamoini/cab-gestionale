"use client";

import { AuthProvider } from "@/context/auth-context";
import { GlobalLoadingProvider } from "@/context/global-loading-context";
import { ThemeProvider } from "@/context/theme-context";
import { ToastProvider } from "@/context/toast-context";
import { GlobalLoadingQueryBridge } from "@/src/components/global-loading-query-bridge";
import { QueryProvider } from "@/src/providers/query-provider";
import { GestionaleClientErrorBoundary } from "@/components/observability/gestionale-client-error-boundary";
import { BodyScrollLockRouteGuard, BodyScrollLockHealGuard } from "@/lib/ui/use-body-scroll-lock";
import { OverlayBackStackGuard } from "@/lib/ui/overlay-back-stack-guard";
import { IosInteractionStability } from "@/src/components/ios-interaction-stability";
import { PwaNetworkNotice } from "@/src/components/pwa-network-notice";
import { PwaServiceWorkerBridge } from "@/src/components/pwa-service-worker-bridge";
import { PwaUpdateBanner } from "@/src/components/pwa-update-banner";
import { PwaDisplayModeBridge } from "@/src/components/pwa-display-mode-bridge";
import { PwaInstallBridge } from "@/src/components/pwa-install-bridge";
import { PwaInstallBanner } from "@/src/components/pwa-install-banner";
import { PwaIosInstallHint } from "@/src/components/pwa-ios-install-hint";
import { PwaReconnectBridge } from "@/src/components/pwa-reconnect-bridge";
import { PwaConnectivityGate } from "@/src/components/pwa-connectivity-gate";
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
            <BodyScrollLockRouteGuard />
            <BodyScrollLockHealGuard />
            <OverlayBackStackGuard />
            <IosInteractionStability />
            <PwaServiceWorkerBridge />
            <PwaDisplayModeBridge />
            <PwaInstallBridge />
            <PwaInstallBanner />
            <PwaIosInstallHint />
            <PwaReconnectBridge />
            <PwaConnectivityGate />
            <PwaUpdateBanner />
            <PwaNetworkNotice />
            <GestionaleClientErrorBoundary>
              <ThemeProvider>{children}</ThemeProvider>
            </GestionaleClientErrorBoundary>
          </AuthProvider>
        </GlobalLoadingProvider>
      </QueryProvider>
    </ToastProvider>
  );
}
