"use client";

import dynamic from "next/dynamic";
import { BrandingProvider } from "@/context/branding-context";
import { AppSettingsQueryProvider } from "@/src/context/app-settings-query-context";
import { DeferredGestionaleBridges } from "@/src/components/deferred-gestionale-bridges";
import { GestionaleDirtySyncModeBridge } from "@/src/components/gestionale-dirty-sync-mode-bridge";
import { GestionaleDirtyProvider } from "@/src/context/gestionale-dirty-context";
import { RealtimeStatusProvider } from "@/src/context/realtime-status-context";
import { SettingsModalOpenProvider } from "@/src/context/settings-modal-open-context";
import { PermissionsSnapshotMount } from "@/components/gestionale/permissions-snapshot-mount";
import { ObservabilityProvider } from "@/components/observability/observability-provider";
import { ObservabilityDiagnosticsPack } from "@/components/observability/observability-diagnostics-pack";
import { useBootInvestigationMount } from "@/lib/observability/use-boot-investigation-mount";
import { DeferredUploadFeedbackShell } from "@/components/gestionale/deferred-upload-feedback-shell";
import { DeferredSupabaseConfigurationBanner } from "@/components/gestionale/deferred-supabase-configuration-banner";

const DevUxEnforcementGuard = dynamic(
  () =>
    import("@/src/components/dev-ux-enforcement-guard").then((m) => ({
      default: m.DevUxEnforcementGuard,
    })),
  { ssr: false },
);

/** Provider operativi gestionale — montati solo sotto `(gestionale)/`. */
export function AppProvidersGestionale({ children }: { children: React.ReactNode }) {
  useBootInvestigationMount("AppProvidersGestionale");
  return (
    <DeferredUploadFeedbackShell>
      <AppSettingsQueryProvider>
        <RealtimeStatusProvider>
          <ObservabilityProvider>
            <ObservabilityDiagnosticsPack />
            <BrandingProvider>
              <SettingsModalOpenProvider>
                {process.env.NODE_ENV === "development" ? <DevUxEnforcementGuard /> : null}
                <DeferredSupabaseConfigurationBanner />
                <PermissionsSnapshotMount>
                  <GestionaleDirtyProvider>
                    <GestionaleDirtySyncModeBridge />
                    <DeferredGestionaleBridges />
                    {children}
                  </GestionaleDirtyProvider>
                </PermissionsSnapshotMount>
              </SettingsModalOpenProvider>
            </BrandingProvider>
          </ObservabilityProvider>
        </RealtimeStatusProvider>
      </AppSettingsQueryProvider>
    </DeferredUploadFeedbackShell>
  );
}
