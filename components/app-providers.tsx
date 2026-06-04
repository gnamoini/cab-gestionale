"use client";

import { AuthProvider } from "@/context/auth-context";
import { GlobalLoadingProvider } from "@/context/global-loading-context";
import { ThemeProvider } from "@/context/theme-context";
import { ToastProvider } from "@/context/toast-context";
import { UploadFeedbackProvider } from "@/context/upload-feedback-context";
import { UploadFeedbackTray } from "@/components/gestionale/upload";
import { GlobalLoadingQueryBridge } from "@/src/components/global-loading-query-bridge";
import { SupabaseConfigurationBanner } from "@/components/supabase-configuration-banner";
import { QueryProvider } from "@/src/providers/query-provider";
import { DeferredGestionaleBridges } from "@/src/components/deferred-gestionale-bridges";
import { RealtimeStatusProvider } from "@/src/context/realtime-status-context";
import { SettingsModalOpenProvider } from "@/src/context/settings-modal-open-context";
import { DevUxEnforcementGuard } from "@/src/components/dev-ux-enforcement-guard";
import { IosInteractionStability } from "@/src/components/ios-interaction-stability";
import { GestionaleClientErrorBoundary } from "@/components/observability/gestionale-client-error-boundary";
import { ObservabilityProvider } from "@/components/observability/observability-provider";
import { RuntimeHealthBridge } from "@/components/observability/runtime-health-bridge";
import { BodyScrollLockRouteGuard, BodyScrollLockHealGuard } from "@/lib/ui/use-body-scroll-lock";
import type { ServerAuthSnapshot } from "@/src/lib/auth/server-auth-types";

export function AppProviders({
  children,
  initialAuthSnapshot,
}: {
  children: React.ReactNode;
  initialAuthSnapshot?: ServerAuthSnapshot;
}) {
  return (
    <ToastProvider>
      <UploadFeedbackProvider>
        <UploadFeedbackTray />
        <QueryProvider>
          <GlobalLoadingProvider>
            <GlobalLoadingQueryBridge />
            <RealtimeStatusProvider>
              <AuthProvider initialSnapshot={initialAuthSnapshot}>
                <ObservabilityProvider>
                  <RuntimeHealthBridge />
                  <BodyScrollLockRouteGuard />
                  <BodyScrollLockHealGuard />
                  <GestionaleClientErrorBoundary>
                    <ThemeProvider>
                      <SettingsModalOpenProvider>
                        <DevUxEnforcementGuard />
                        <IosInteractionStability />
                        <SupabaseConfigurationBanner />
                        <DeferredGestionaleBridges />
                        {children}
                      </SettingsModalOpenProvider>
                    </ThemeProvider>
                  </GestionaleClientErrorBoundary>
                </ObservabilityProvider>
              </AuthProvider>
            </RealtimeStatusProvider>
          </GlobalLoadingProvider>
        </QueryProvider>
      </UploadFeedbackProvider>
    </ToastProvider>
  );
}
