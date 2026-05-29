"use client";

import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import {
  SCHEDA_INGRESSO_LABEL,
  SCHEDA_LAVORAZIONI_LABEL,
  SCHEDA_RICAMBI_LABEL,
} from "@/lib/schede/schede-log-helpers";
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
  if (!tipo) return null;
  const label = schedaLabelForTipo(tipo);

  return (
    <GestionaleConfirmDialog
      open={open}
      title="Eliminare scheda?"
      layerClassName="z-[120]"
      message={
        <>
          Stai per eliminare <span className="font-semibold">{label}</span> da questa lavorazione.
          <br />
          Questa operazione è irreversibile.
        </>
      }
      confirmLabel="Elimina scheda"
      destructive
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
