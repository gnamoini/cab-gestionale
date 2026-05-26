"use client";

import { mezzoIngressoSuggestLabel } from "@/lib/schede/scheda-ingresso-ident-suggest";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { dsBtnNeutral, dsBtnPrimary, dsBtnSoftOrange } from "@/lib/ui/design-system";

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
  if (!open || !mezzo) return null;

  return (
    <div
      className="fixed inset-0 z-[calc(var(--ds-z-modal,80)+1)] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mezzo-duplicato-anagrafica-title"
    >
      <div className="w-full max-w-md rounded-xl border border-[color:var(--cab-border)] bg-[var(--cab-card)] p-5 shadow-2xl">
        <h3 id="mezzo-duplicato-anagrafica-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Mezzo già in anagrafica
        </h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Esiste già un mezzo con la stessa targa o matricola. Come procedere?
        </p>
        <p className="mt-2 rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-surface-muted)] px-3 py-2 text-xs text-zinc-700 dark:text-zinc-200">
          {mezzoIngressoSuggestLabel(mezzo)}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <button type="button" className={dsBtnNeutral} onClick={onCancel}>
            Annulla
          </button>
          <button type="button" className={dsBtnSoftOrange} onClick={onKeepExisting}>
            Mantieni dati esistenti
          </button>
          <button type="button" className={dsBtnPrimary} onClick={onOverwrite}>
            Sovrascrivi anagrafica
          </button>
        </div>
      </div>
    </div>
  );
}
