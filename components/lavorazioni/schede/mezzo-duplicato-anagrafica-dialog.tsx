"use client";

import { GestionaleConfirmDialog, gestionaleConfirmActionsClass } from "@/components/gestionale/gestionale-confirm-dialog";
import { GestionaleModalFooterCancelButton } from "@/components/design-system";
import { mezzoIngressoSuggestLabel } from "@/lib/schede/scheda-ingresso-ident-suggest";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { dsBtnPrimary, dsBtnSoftOrange } from "@/lib/ui/design-system";

export type MezzoDuplicatoAnagraficaChoice = "overwrite" | "keep";

export function MezzoDuplicatoAnagraficaDialog({
  open,
  mezzo,
  onOverwrite,
  onKeepExisting,
  onCancel,
}: {
  open: boolean;
  mezzo: MezzoGestito | null;
  onOverwrite: () => void;
  onKeepExisting: () => void;
  onCancel: () => void;
}) {
  if (!mezzo) return null;

  return (
    <GestionaleConfirmDialog
      open={open}
      title="Mezzo già in anagrafica"
      layerClassName="z-[calc(var(--ds-z-modal,80)+1)]"
      onCancel={onCancel}
      footer={
        <div className={gestionaleConfirmActionsClass}>
          <GestionaleModalFooterCancelButton className="w-full sm:w-auto" onClick={onCancel} />
          <button type="button" className={`${dsBtnSoftOrange} min-h-[2.75rem] sm:min-h-0`} onClick={onKeepExisting}>
            Mantieni dati esistenti
          </button>
          <button type="button" className={`${dsBtnPrimary} min-h-[2.75rem] sm:min-h-0`} onClick={onOverwrite}>
            Sovrascrivi anagrafica
          </button>
        </div>
      }
    >
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        Esiste già un mezzo con la stessa targa o matricola. Come procedere?
      </p>
      <p className="mt-2 rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-surface-muted)] px-3 py-2 text-xs text-zinc-700 dark:text-zinc-200">
        {mezzoIngressoSuggestLabel(mezzo)}
      </p>
    </GestionaleConfirmDialog>
  );
}
