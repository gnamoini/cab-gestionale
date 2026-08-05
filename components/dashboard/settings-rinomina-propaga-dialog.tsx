"use client";

import { useState } from "react";
import { Tooltip } from "@/components/ui";
import { GestionaleConfirmDialog, gestionaleConfirmActionsClass } from "@/components/gestionale/gestionale-confirm-dialog";
import { dsBtnNeutral, dsBtnPrimary } from "@/lib/ui/design-system";
import type { SettingsRenameEntry } from "@/lib/settings/settings-rename-types";
import type { RenameImpact } from "@/lib/settings/rename-engine/types";

export type PropagaImpactSummary = {
  entry: SettingsRenameEntry;
  impact?: RenameImpact;
  loading?: boolean;
  validationBlocked?: boolean;
  validationWarnings?: string[];
};

export function SettingsRinominaPropagaDialog({
  open,
  entries,
  impactSummaries,
  onConfigOnly,
  onConfirm,
  pending,
  progressLabel,
  errorMessage,
}: {
  open: boolean;
  entries: SettingsRenameEntry[];
  impactSummaries?: PropagaImpactSummary[];
  onConfigOnly: () => void;
  onConfirm: () => void;
  pending?: boolean;
  progressLabel?: string;
  errorMessage?: string | null;
}) {
  const [configConfirmOpen, setConfigConfirmOpen] = useState(false);

  if (entries.length === 0) return null;

  const totalUpdatable = impactSummaries?.reduce((s, i) => s + (i.impact?.totalUpdatable ?? 0), 0) ?? 0;
  const totalProtected = impactSummaries?.reduce((s, i) => s + (i.impact?.totalProtected ?? 0), 0) ?? 0;
  const showRetry = Boolean(errorMessage) && !pending;
  const propagateLabel = pending
    ? progressLabel?.trim() || "Aggiornamento…"
    : showRetry
      ? "Riprova"
      : "Propaga dati live";

  return (
    <>
      <GestionaleConfirmDialog
        open={open && !configConfirmOpen}
        title="Propagare le modifiche?"
        onCancel={() => setConfigConfirmOpen(true)}
        footer={
          <div className={gestionaleConfirmActionsClass}>
            <Tooltip
              content={
                showRetry
                  ? "Riprova l'aggiornamento dei record collegati"
                  : "Aggiorna mezzi, preventivi, schede e altri record collegati (dati live)"
              }
            >
              <button type="button" className={`${dsBtnPrimary} min-h-[2.75rem] sm:min-h-0`} onClick={onConfirm} disabled={pending}>
                {propagateLabel}
              </button>
            </Tooltip>
            <Tooltip content="Salva solo in configurazione, senza aggiornare i record esistenti">
              <button
                type="button"
                className={`${dsBtnNeutral} min-h-[2.75rem] sm:min-h-0`}
                onClick={() => setConfigConfirmOpen(true)}
                disabled={pending}
              >
                Solo configurazione
              </button>
            </Tooltip>
          </div>
        }
      >
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          Hai rinominato {entries.length} {entries.length === 1 ? "elemento" : "elementi"}. Le pagine operative (Mezzi,
          Lavorazioni, Preventivi) mostrano i valori salvati sui record, non il catalogo Impostazioni finché non
          propaghi.
        </p>
        <p className="mt-2 text-xs text-[color:var(--cab-text-muted)]">
          I documenti già emessi (DDT, fatture) restano con il nome storico.
        </p>
        <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto text-xs text-[color:var(--cab-text-muted)] gestionale-scrollbar">
          {entries.map((e) => (
            <li key={`${e.kind}-${e.from}-${e.to}`}>
              <span className="font-medium text-[color:var(--cab-text)]">{e.from}</span>
              {" → "}
              <span className="font-medium text-[color:var(--cab-text)]">{e.to}</span>
            </li>
          ))}
        </ul>
        {errorMessage ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {errorMessage}
          </p>
        ) : null}
        {impactSummaries && impactSummaries.length > 0 ? (
          <div className="mt-3 rounded-md border border-[color:var(--cab-border)] bg-[color:var(--cab-surface-muted)] p-3 text-xs">
            <p className="font-medium text-[color:var(--cab-text)]">Impatto stimato (dati live)</p>
            {totalUpdatable > 0 ? (
              <p className="mt-1 text-[color:var(--cab-text-muted)]">{totalUpdatable} record aggiornabili</p>
            ) : (
              <p className="mt-1 text-[color:var(--cab-text-muted)]">Caricamento impatto…</p>
            )}
            {totalProtected > 0 ? (
              <p className="mt-1 text-[color:var(--cab-text-muted)]">{totalProtected} record protetti (non modificati)</p>
            ) : null}
            <ul className="mt-2 max-h-28 space-y-0.5 overflow-y-auto gestionale-scrollbar">
              {impactSummaries.flatMap((s) =>
                (s.impact?.items ?? [])
                  .filter((i) => i.updatable > 0 || i.protected > 0)
                  .map((i) => (
                    <li key={`${s.entry.kind}-${i.operationId}`}>
                      {i.table}: {i.updatable > 0 ? `${i.updatable} aggiornabili` : ""}
                      {i.updatable > 0 && i.protected > 0 ? ", " : ""}
                      {i.protected > 0 ? `${i.protected} protetti` : ""}
                    </li>
                  )),
              )}
            </ul>
            {impactSummaries.some((s) => s.validationWarnings?.length) ? (
              <p className="mt-2 text-amber-700 dark:text-amber-400">
                {impactSummaries.flatMap((s) => s.validationWarnings ?? []).join(" ")}
              </p>
            ) : null}
          </div>
        ) : null}
      </GestionaleConfirmDialog>

      <GestionaleConfirmDialog
        open={configConfirmOpen}
        title="Solo configurazione?"
        message="I record esistenti manterranno il vecchio nome finché non esegui la propagazione. Puoi riparare lo scostamento da Impostazioni → Stato propagazioni."
        confirmLabel="Conferma solo configurazione"
        cancelLabel="Torna indietro"
        onConfirm={() => {
          setConfigConfirmOpen(false);
          onConfigOnly();
        }}
        onCancel={() => setConfigConfirmOpen(false)}
      />
    </>
  );
}
