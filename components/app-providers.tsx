"use client";

import { AuthProvider } from "@/context/auth-context";
import { ThemeProvider } from "@/context/theme-context";
import { ToastProvider } from "@/context/toast-context";
import { SupabaseConfigurationBanner } from "@/components/supabase-configuration-banner";
import { QueryProvider } from "@/src/providers/query-provider";
import { AppSettingsRealtimeBridge } from "@/src/components/app-settings-realtime-bridge";
import { GestionaleRealtimeBridge } from "@/src/components/gestionale-realtime-bridge";
import { SettingsModalOpenProvider } from "@/src/context/settings-modal-open-context";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <QueryProvider>
          <AuthProvider>
            <SettingsModalOpenProvider>
              <SupabaseConfigurationBanner />
              <AppSettingsRealtimeBridge />
              <GestionaleRealtimeBridge />
              {children}
            </SettingsModalOpenProvider>
          </AuthProvider>
        </QueryProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
