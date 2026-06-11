"use client";

import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import { cabModalZConfirm } from "@/lib/ui/mobile-modal-behavior";
import { mezzoIngressoSuggestLabel } from "@/lib/schede/scheda-ingresso-ident-suggest";
import type { MezzoGestito } from "@/lib/mezzi/types";

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
  if (!mezzo) return null;

  return (
    <GestionaleConfirmDialog
      open={open}
      title="Mezzo già presente"
      layerClassName={cabModalZConfirm}
      cancelLabel="Continua manualmente"
      confirmLabel="Compila automaticamente"
      onCancel={onDismiss}
      onConfirm={onAccept}
    >
      <p className="text-sm text-zinc-700 dark:text-zinc-300">Vuoi compilare automaticamente i dati del mezzo?</p>
      <p className="mt-2 rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-surface-muted)] px-3 py-2 text-xs text-zinc-700 dark:text-zinc-200">
        {mezzoIngressoSuggestLabel(mezzo)}
      </p>
      <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
        I campi già compilati manualmente non verranno sovrascritti. Potrai modificarli liberamente dopo.
      </p>
    </GestionaleConfirmDialog>
  );
}
