"use client";

import { dsBtnNeutral, dsBtnPrimary, dsTypoSmall } from "@/lib/ui/design-system";

export type DipendentiEmptyStateVariant =
  | "no-addetti"
  | "no-employees"
  | "no-entries"
  | "select-employee";

export function DipendentiEmptyState({
  variant,
  monthLabel,
  onBootstrap,
  bootstrapPending,
  bootstrapError,
  readOnly,
}: {
  variant: DipendentiEmptyStateVariant;
  monthLabel?: string;
  onBootstrap?: () => void;
  bootstrapPending?: boolean;
  bootstrapError?: string | null;
  readOnly?: boolean;
}) {
  if (variant === "no-addetti") {
    return (
      <div className="rounded-[var(--ds-radius-lg)] border border-dashed border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-4 py-8 text-center">
        <p className="text-sm font-medium text-[color:var(--cab-text)]">Nessun addetto configurato</p>
        <p className={`mt-2 ${dsTypoSmall}`}>
          Aggiungi gli addetti in <strong>Configurazione → Lavorazioni</strong> per abilitare il registro presenze.
        </p>
      </div>
    );
  }

  if (variant === "no-employees") {
    return (
      <div className="rounded-[var(--ds-radius-lg)] border border-dashed border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-4 py-8 text-center">
        <p className="text-sm font-medium text-[color:var(--cab-text)]">Registro dipendenti non inizializzato</p>
        <p className={`mt-2 ${dsTypoSmall}`}>
          Gli addetti sono presenti in configurazione ma il registro timesheet non è ancora stato creato.
        </p>
        {bootstrapError ? <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{bootstrapError}</p> : null}
        {!readOnly && onBootstrap ? (
          <button
            type="button"
            className={`${dsBtnPrimary} mt-4`}
            disabled={bootstrapPending}
            onClick={() => void onBootstrap()}
          >
            {bootstrapPending ? "Inizializzazione…" : "Inizializza registro dipendenti"}
          </button>
        ) : readOnly ? (
          <p className={`mt-3 ${dsTypoSmall}`}>Contatta un utente con permesso di scrittura per l&apos;inizializzazione.</p>
        ) : null}
      </div>
    );
  }

  if (variant === "select-employee") {
    return (
      <p className="text-sm text-[color:var(--cab-text-muted)]">
        Seleziona un dipendente nella toolbar per visualizzare i dati di questa sezione.
      </p>
    );
  }

  return (
    <div className="rounded-[var(--ds-radius-lg)] border border-dashed border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-4 py-6 text-center">
      <p className="text-sm font-medium text-[color:var(--cab-text)]">Nessuna presenza registrata</p>
      <p className={`mt-2 ${dsTypoSmall}`}>
        {monthLabel ? (
          <>
            Non ci sono ore o assenze per <strong>{monthLabel}</strong>. Usa la sezione{" "}
            <strong>Registrazione presenze</strong> per iniziare.
          </>
        ) : (
          <>Usa la sezione Registrazione presenze per registrare ore e assenze.</>
        )}
      </p>
    </div>
  );
}

export function DipendentiQueryErrorBanner({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-[var(--ds-radius-lg)] border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900/50 dark:bg-rose-950/30"
    >
      <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">{title}</p>
      <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">{message}</p>
      {onRetry ? (
        <button type="button" className={`${dsBtnNeutral} mt-3 text-xs`} onClick={onRetry}>
          Riprova
        </button>
      ) : null}
    </div>
  );
}
