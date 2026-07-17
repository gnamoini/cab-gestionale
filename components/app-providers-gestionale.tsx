"use client";

import { BrandingProvider } from "@/context/branding-context";
import { UploadFeedbackProvider } from "@/context/upload-feedback-context";
import { UploadFeedbackTray } from "@/components/gestionale/upload";
import { SupabaseConfigurationBanner } from "@/components/supabase-configuration-banner";
import { AppSettingsQueryProvider } from "@/src/context/app-settings-query-context";
import { DeferredGestionaleBridges } from "@/src/components/deferred-gestionale-bridges";
import { RealtimeStatusProvider } from "@/src/context/realtime-status-context";
import { SettingsModalOpenProvider } from "@/src/context/settings-modal-open-context";
import { DevUxEnforcementGuard } from "@/src/components/dev-ux-enforcement-guard";
import { PermissionsSnapshotMount } from "@/components/gestionale/permissions-snapshot-mount";
import { ObservabilityProvider } from "@/components/observability/observability-provider";
import { RuntimeHealthBridge } from "@/components/observability/runtime-health-bridge";
import { BootInvestigationMount } from "@/components/observability/boot-investigation-mount";
import { useBootInvestigationMount } from "@/lib/observability/use-boot-investigation-mount";

if (process.env.NODE_ENV === "development") {
  void import("@/lib/observability/overflow-root-cause-audit");
}

/** Provider operativi gestionale — montati solo sotto `(gestionale)/`. */
export function AppProvidersGestionale({ children }: { children: React.ReactNode }) {
  useBootInvestigationMount("AppProvidersGestionale");
  return (
    <UploadFeedbackProvider>
      <UploadFeedbackTray />
      <AppSettingsQueryProvider>
        <RealtimeStatusProvider>
          <ObservabilityProvider>
            <BootInvestigationMount />
            <RuntimeHealthBridge />
            <BrandingProvider>
              <SettingsModalOpenProvider>
                <DevUxEnforcementGuard />
                <SupabaseConfigurationBanner />
                <PermissionsSnapshotMount>
                  <DeferredGestionaleBridges />
                  {children}
                </PermissionsSnapshotMount>
              </SettingsModalOpenProvider>
            </BrandingProvider>
          </ObservabilityProvider>
        </RealtimeStatusProvider>
      </AppSettingsQueryProvider>
    </UploadFeedbackProvider>
  );
}
