"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { isSupabasePublicEnvConfigured, MISSING_SUPABASE_ENV_MESSAGE } from "@/lib/env/supabase-public";
import { useGestionaleTopNotice } from "@/components/gestionale/gestionale-top-notice";
import { GLOBAL_LOADING_MESSAGES } from "@/lib/ui/global-loading-messages";
import { getRuntimeCabAppSettings } from "@/src/lib/app-settings/runtime-settings-cache";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

const SETTINGS_LOADING_FAILSAFE_MS = 5_000;
const SETTINGS_NOTICE_DELAY_MS = 300;

/**
 * Dopo autenticazione, carica le impostazioni business da Supabase in parallelo alla shell.
 * In caso di errore degrada con defaults (non blocca operatore/ospite).
 */
export function GestionaleSettingsReadyGate({ children }: { children: React.ReactNode }) {
  const { configurationError } = useAuth();
  const toast = useGestionaleToast();
  const settingsBlocked = !isSupabasePublicEnvConfigured() || !!configurationError;
  const q = useCabAppSettingsPayloadQuery({ enabled: !settingsBlocked, tier: "static" });
  const hasRuntimeCache = Boolean(getRuntimeCabAppSettings());
  const settingsLoading = q.isPending && !q.data && !hasRuntimeCache;
  const [hydrated, setHydrated] = useState(false);
  const [loadingFailsafe, setLoadingFailsafe] = useState(false);
  const failsafeToastShownRef = useRef(false);
  const showSettingsNotice = hydrated && settingsLoading && !loadingFailsafe;
  const showSettingsError = q.isError && !q.data;
  const settingsErrorMessage = q.error instanceof Error ? q.error.message : "errore";

  const onRetrySettings = useCallback(() => {
    void q.refetch();
  }, [q]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!settingsLoading) {
      setLoadingFailsafe(false);
      failsafeToastShownRef.current = false;
      return;
    }
    const id = window.setTimeout(() => setLoadingFailsafe(true), SETTINGS_LOADING_FAILSAFE_MS);
    return () => window.clearTimeout(id);
  }, [settingsLoading]);

  useEffect(() => {
    if (!loadingFailsafe || failsafeToastShownRef.current) return;
    failsafeToastShownRef.current = true;
    toast.warning(
      "Caricamento impostazioni lento: l'app usa i valori già disponibili finché la sincronizzazione non termina.",
    );
  }, [loadingFailsafe, toast]);

  useGestionaleTopNotice("settings", {
    visible: showSettingsNotice,
    message: GLOBAL_LOADING_MESSAGES.settings,
    busy: true,
    showDelayMs: SETTINGS_NOTICE_DELAY_MS,
  });

  useGestionaleTopNotice("settings-error", {
    visible: showSettingsError,
    message: `Impostazioni globali non disponibili (${settingsErrorMessage}). Uso valori predefiniti.`,
    tone: "warning",
    action: { label: "Riprova", onClick: onRetrySettings },
  });

  if (settingsBlocked) {
    return (
      <div className="flex min-w-0 min-h-[50vh] flex-col items-center justify-center gap-3 px-4 py-16 text-center">
        <p className="max-w-md text-sm font-semibold text-[color:var(--cab-text)]" role="alert">
          {MISSING_SUPABASE_ENV_MESSAGE}
        </p>
        <p className="max-w-xs text-xs text-[color:var(--cab-text-muted)]">
          Le impostazioni business sono solo su database: correggere la configurazione Supabase pubblica prima di continuare.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
