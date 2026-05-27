"use client";

import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import {
  SCHEDA_INGRESSO_LABEL,
  SCHEDA_LAVORAZIONI_LABEL,
  SCHEDA_RICAMBI_LABEL,
} from "@/lib/schede/schede-log-helpers";
import { dsBtnDanger, dsBtnNeutral } from "@/lib/ui/design-system";
import type { SchedaTipo } from "@/types/schede";

export function schedaLabelForTipo(tipo: SchedaTipo): string {
  switch (tipo) {
    case "ingresso":
      return SCHEDA_INGRESSO_LABEL;
    case "lavorazioni":
      return SCHEDA_LAVORAZIONI_LABEL;
    case "ricambi":
      return SCHEDA_RICAMBI_LABEL;
  }
}

export function SchedaEliminaConfirmDialog({
  open,
  tipo,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  tipo: SchedaTipo | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open || !tipo) return null;

  const label = schedaLabelForTipo(tipo);

  return (
    <LavorazioniModalShell
      layerClassName="z-[120]"
      onRequestClose={onCancel}
      title="Eliminare scheda?"
    >
      <div className="p-4 sm:p-6">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          Stai per eliminare <span className="font-semibold">{label}</span> da questa lavorazione.
          <br />
          Questa operazione è irreversibile.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className={dsBtnNeutral} onClick={onCancel}>
            Annulla
          </button>
          <button type="button" className={dsBtnDanger} onClick={onConfirm}>
            Elimina scheda
          </button>
        </div>
      </div>
    </LavorazioniModalShell>
  );
}
