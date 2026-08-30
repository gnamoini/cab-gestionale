"use client";

import dynamic from "next/dynamic";
import { AuthProvider } from "@/context/auth-context";
import { GlobalLoadingProvider } from "@/context/global-loading-context";
import { ThemeProvider } from "@/context/theme-context";
import { ToastProvider } from "@/context/toast-context";
import { PopupGuardProvider } from "@/context/popup-guard-context";
import { AppBootScreenBridge } from "@/src/components/app-boot-screen-bridge";
import { QueryProvider } from "@/src/providers/query-provider";
import { GestionaleClientErrorBoundary } from "@/components/observability/gestionale-client-error-boundary";
import { BodyScrollLockRouteGuard, BodyScrollLockHealGuard } from "@/lib/ui/use-body-scroll-lock";
import { OverlayBackStackGuard } from "@/lib/ui/overlay-back-stack-guard";
import type { ServerAuthSnapshot } from "@/src/lib/auth/server-auth-types";

const IosInteractionStability = dynamic(
  () =>
    import("@/src/components/ios-interaction-stability").then((m) => ({
      default: m.IosInteractionStability,
    })),
  { ssr: false },
);

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
      <PopupGuardProvider>
      <QueryProvider>
        <GlobalLoadingProvider>
          <AuthProvider initialSnapshot={initialAuthSnapshot}>
            <AppBootScreenBridge />
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
      </PopupGuardProvider>
    </ToastProvider>
  );
}
