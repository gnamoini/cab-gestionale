"use client";

import { RBAC_DENIED_MESSAGE } from "@/lib/rbac";
import type { TimesheetErrorKind, TimesheetLoadPhase } from "@/src/hooks/use-dipendenti-timesheet";
import { dsBtnNeutral } from "@/lib/ui/design-system";

export function TimesheetLoadError({
  loadPhase,
  errorKind,
  employeesError,
  entriesError,
  syncError,
  onRetryEmployees,
  onRetryEntries,
}: {
  loadPhase: TimesheetLoadPhase;
  errorKind: TimesheetErrorKind | null;
  employeesError: string | null;
  entriesError: string | null;
  syncError: string | null;
  onRetryEmployees?: () => void;
  onRetryEntries?: () => void;
}) {
  if (loadPhase !== "error" && !syncError) return null;

  const message = employeesError ?? entriesError ?? syncError ?? "Errore sconosciuto.";
  const title =
    employeesError != null
      ? "Impossibile caricare il registro dipendenti"
      : entriesError != null
        ? "Impossibile caricare le presenze"
        : "Sincronizzazione addetti non riuscita";

  const hint =
    errorKind === "rbac" || message === RBAC_DENIED_MESSAGE
      ? "Contatta un amministratore per i permessi sul modulo Dipendenti."
      : errorKind === "sync"
        ? "Verifica gli addetti in Configurazione → Lavorazioni e riprova."
        : errorKind === "network"
          ? "Controlla la connessione e riprova."
          : "Se il problema persiste, verifica migrazioni Supabase e permessi RLS.";

  return (
    <div
      role="alert"
      className="rounded-[var(--ds-radius-lg)] border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900/50 dark:bg-rose-950/30"
    >
      <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">{title}</p>
      <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">{message}</p>
      <p className="mt-2 text-xs text-rose-600/90 dark:text-rose-400/90">{hint}</p>
      <div className="mt-3 flex min-w-0 max-w-full flex-safe-row gap-2 sm:flex-wrap">
        {onRetryEmployees && employeesError ? (
          <button type="button" className={`${dsBtnNeutral} text-xs`} onClick={onRetryEmployees}>
            Riprova registro
          </button>
        ) : null}
        {onRetryEntries && entriesError ? (
          <button type="button" className={`${dsBtnNeutral} text-xs`} onClick={onRetryEntries}>
            Riprova presenze
          </button>
        ) : null}
      </div>
    </div>
  );
}
