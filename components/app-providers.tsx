"use client";

import { AuthProvider } from "@/context/auth-context";
import { ThemeProvider } from "@/context/theme-context";
import { ToastProvider } from "@/context/toast-context";
import { SupabaseConfigurationBanner } from "@/components/supabase-configuration-banner";
import { QueryProvider } from "@/src/providers/query-provider";
import { GestionaleRealtimeBridge } from "@/src/components/gestionale-realtime-bridge";
import { GestionaleSnapshotRecoveryBridge } from "@/src/components/gestionale-snapshot-recovery-bridge";
import { RealtimeStatusProvider } from "@/src/context/realtime-status-context";
import { SettingsModalOpenProvider } from "@/src/context/settings-modal-open-context";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <QueryProvider>
          <RealtimeStatusProvider>
            <AuthProvider>
              <SettingsModalOpenProvider>
                <SupabaseConfigurationBanner />
                <GestionaleRealtimeBridge />
                <GestionaleSnapshotRecoveryBridge />
                {children}
              </SettingsModalOpenProvider>
            </AuthProvider>
          </RealtimeStatusProvider>
        </QueryProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
