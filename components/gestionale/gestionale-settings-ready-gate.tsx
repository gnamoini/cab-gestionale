"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { isSupabasePublicEnvConfigured, MISSING_SUPABASE_ENV_MESSAGE } from "@/lib/env/supabase-public";
import { LoadingProgressBar } from "@/components/design-system/loading";
import { loadingCaptionClass } from "@/components/design-system/loading/loading-tokens";
import { GLOBAL_LOADING_MESSAGES } from "@/lib/ui/global-loading-messages";
import { getRuntimeCabAppSettings } from "@/src/lib/app-settings/runtime-settings-cache";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

const SETTINGS_LOADING_FAILSAFE_MS = 5_000;

/**
 * Dopo autenticazione, carica le impostazioni business da Supabase in parallelo alla shell.
 * In caso di errore degrada con defaults (non blocca operatore/ospite).
 */
export function GestionaleSettingsReadyGate({ children }: { children: React.ReactNode }) {
  const { configurationError } = useAuth();
  const toast = useGestionaleToast();
  const settingsBlocked = !isSupabasePublicEnvConfigured() || !!configurationError;
  const q = useCabAppSettingsPayloadQuery({ enabled: !settingsBlocked });
  const hasRuntimeCache = Boolean(getRuntimeCabAppSettings());
  const settingsLoading = q.isPending && !q.data && !hasRuntimeCache;
  const [hydrated, setHydrated] = useState(false);
  const [loadingFailsafe, setLoadingFailsafe] = useState(false);
  const failsafeToastShownRef = useRef(false);
  const showSettingsBanner = hydrated && settingsLoading && !loadingFailsafe;

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

  return (
    <>
      {showSettingsBanner ? (
        <div
          className="border-b border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-primary)_6%,var(--cab-card))] px-4 py-2"
          role="status"
          aria-busy="true"
        >
          <div className="mx-auto min-w-0 max-w-3xl space-y-1.5">
            <p className={`text-center ${loadingCaptionClass}`}>{GLOBAL_LOADING_MESSAGES.settings}</p>
            <LoadingProgressBar label={GLOBAL_LOADING_MESSAGES.settings} className="max-w-md mx-auto" />
          </div>
        </div>
      ) : null}
      {q.isError && !q.data ? (
        <div
          className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
          role="status"
        >
          Impostazioni globali non disponibili ({q.error instanceof Error ? q.error.message : "errore"}). Uso valori predefiniti.
          <button
            type="button"
            className="ml-2 font-semibold underline"
            onClick={() => void q.refetch()}
          >
            Riprova
          </button>
        </div>
      ) : null}
      {children}
    </>
  );
}
