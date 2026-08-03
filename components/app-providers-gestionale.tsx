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
import {
  markProviderMountEnd,
  markProviderMountStart,
  exposeProviderMountProfile,
} from "@/lib/performance/provider-mount-instrumentation";
import { useEffect } from "react";

const DevUxEnforcementGuard = dynamic(
  () =>
    import("@/src/components/dev-ux-enforcement-guard").then((m) => ({
      default: m.DevUxEnforcementGuard,
    })),
  { ssr: false },
);

function ProviderMountMarker({ id, children }: { id: string; children: React.ReactNode }) {
  useEffect(() => {
    markProviderMountStart(id);
    markProviderMountEnd(id);
    exposeProviderMountProfile();
  }, [id]);
  return <>{children}</>;
}

/** Provider operativi gestionale — montati solo sotto `(gestionale)/`. */
export function AppProvidersGestionale({ children }: { children: React.ReactNode }) {
  useBootInvestigationMount("AppProvidersGestionale");
  return (
    <ProviderMountMarker id="AppProvidersGestionale">
      <DeferredUploadFeedbackShell>
        <ProviderMountMarker id="AppSettingsQueryProvider">
          <AppSettingsQueryProvider>
            <ProviderMountMarker id="RealtimeStatusProvider">
              <RealtimeStatusProvider>
                <ProviderMountMarker id="ObservabilityProvider">
                  <ObservabilityProvider>
                    <ObservabilityDiagnosticsPack />
                    <ProviderMountMarker id="BrandingProvider">
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
                    </ProviderMountMarker>
                  </ObservabilityProvider>
                </ProviderMountMarker>
              </RealtimeStatusProvider>
            </ProviderMountMarker>
          </AppSettingsQueryProvider>
        </ProviderMountMarker>
      </DeferredUploadFeedbackShell>
    </ProviderMountMarker>
  );
}
