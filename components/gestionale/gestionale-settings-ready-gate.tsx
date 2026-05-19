"use client";

import { useAuth } from "@/context/auth-context";
import { isSupabasePublicEnvConfigured, MISSING_SUPABASE_ENV_MESSAGE } from "@/lib/env/supabase-public";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";

/**
 * Dopo autenticazione, attende il primo fetch delle impostazioni business da Supabase
 * quando possibile; in caso di errore degrada con defaults (non blocca operatore/ospite).
 */
export function GestionaleSettingsReadyGate({ children }: { children: React.ReactNode }) {
  const { configurationError } = useAuth();
  const settingsBlocked = !isSupabasePublicEnvConfigured() || !!configurationError;
  const q = useCabAppSettingsPayloadQuery({ enabled: !settingsBlocked });

  if (settingsBlocked) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 py-16 text-center">
        <p className="max-w-md text-sm font-semibold text-[color:var(--cab-text)]" role="alert">
          {MISSING_SUPABASE_ENV_MESSAGE}
        </p>
        <p className="max-w-xs text-xs text-[color:var(--cab-text-muted)]">
          Le impostazioni business sono solo su database: correggere la configurazione Supabase pubblica prima di continuare.
        </p>
      </div>
    );
  }

  if (q.isPending && !q.data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 py-16 text-center">
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-[color:var(--cab-border)] border-t-[color:var(--cab-primary)]"
          aria-hidden
        />
        <p className="text-sm font-medium text-[color:var(--cab-text-muted)]">Caricamento impostazioni…</p>
      </div>
    );
  }

  return (
    <>
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
