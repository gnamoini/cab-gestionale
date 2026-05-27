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
import { GestionaleRealtimeBridge } from "@/src/components/gestionale-realtime-bridge";
import { GestionaleSnapshotRecoveryBridge } from "@/src/components/gestionale-snapshot-recovery-bridge";
import { GestionaleNotificationsBridge } from "@/src/components/gestionale-notifications-bridge";
import { RealtimeStatusProvider } from "@/src/context/realtime-status-context";
import { SettingsModalOpenProvider } from "@/src/context/settings-modal-open-context";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <UploadFeedbackProvider>
        <UploadFeedbackTray />
        <QueryProvider>
          <GlobalLoadingProvider>
            <GlobalLoadingQueryBridge />
            <RealtimeStatusProvider>
              <AuthProvider>
                <ThemeProvider>
                  <SettingsModalOpenProvider>
                    <SupabaseConfigurationBanner />
                    <GestionaleRealtimeBridge />
                    <GestionaleNotificationsBridge />
                    <GestionaleSnapshotRecoveryBridge />
                    {children}
                  </SettingsModalOpenProvider>
                </ThemeProvider>
              </AuthProvider>
            </RealtimeStatusProvider>
          </GlobalLoadingProvider>
        </QueryProvider>
      </UploadFeedbackProvider>
    </ToastProvider>
  );
}
