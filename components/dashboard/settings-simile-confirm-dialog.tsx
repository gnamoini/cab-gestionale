"use client";

import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { dsBtnNeutral, dsBtnPrimary } from "@/lib/ui/design-system";

export function SettingsSimileConfirmDialog({
  open,
  candidate,
  similarTo,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  candidate: string;
  similarTo: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <LavorazioniModalShell onRequestClose={onCancel} title="Elemento simile esistente">
      <div className="p-4 sm:p-6">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          Esiste già un elemento simile: <span className="font-semibold">{similarTo}</span>
          <br />
          <span className="mt-2 block text-[color:var(--cab-text-muted)]">
            Stai inserendo: <span className="font-medium text-[color:var(--cab-text)]">{candidate}</span>
          </span>
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className={dsBtnNeutral} onClick={onCancel}>
            Annulla
          </button>
          <button type="button" className={dsBtnPrimary} onClick={onConfirm}>
            Inserisci comunque
          </button>
        </div>
      </div>
    </LavorazioniModalShell>
  );
}
