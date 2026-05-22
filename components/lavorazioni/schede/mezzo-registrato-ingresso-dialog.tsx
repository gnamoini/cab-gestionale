"use client";

import { mezzoIngressoSuggestLabel } from "@/lib/schede/scheda-ingresso-ident-suggest";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { dsBtnNeutral, dsBtnPrimary } from "@/lib/ui/design-system";

export function MezzoRegistratoIngressoDialog({
  open,
  mezzo,
  onAccept,
  onDismiss,
}: {
  open: boolean;
  mezzo: MezzoGestito | null;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  if (!open || !mezzo) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--ds-z-modal,80)] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mezzo-registrato-ingresso-title"
    >
      <div className="w-full max-w-md rounded-xl border border-[color:var(--cab-border)] bg-[var(--cab-card)] p-5 shadow-2xl">
        <h3 id="mezzo-registrato-ingresso-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Mezzo già registrato
        </h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Vuoi compilare automaticamente la scheda di ingresso con i dati disponibili?
        </p>
        <p className="mt-2 rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-surface-muted)] px-3 py-2 text-xs text-zinc-700 dark:text-zinc-200">
          {mezzoIngressoSuggestLabel(mezzo)}
        </p>
        <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
          I campi già compilati manualmente non verranno sovrascritti. Potrai modificarli liberamente dopo.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <button type="button" className={dsBtnNeutral} onClick={onDismiss}>
            Continua manualmente
          </button>
          <button type="button" className={dsBtnPrimary} onClick={onAccept}>
            Compila automaticamente
          </button>
        </div>
      </div>
    </div>
  );
}
