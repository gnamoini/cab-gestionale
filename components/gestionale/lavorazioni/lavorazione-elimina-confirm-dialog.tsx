"use client";

import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { erpBtnNeutral } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { dsBtnDanger } from "@/lib/ui/design-system";

export function LavorazioneEliminaConfirmDialog({
  open,
  onCancel,
  onConfirm,
  pending,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  pending?: boolean;
}) {
  if (!open) return null;

  return (
    <LavorazioniModalShell
      onRequestClose={pending ? () => {} : onCancel}
      title="Eliminare lavorazione?"
    >
      <div className="p-4 sm:p-6">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          Questa operazione è irreversibile.
          <br />
          La lavorazione verrà eliminata definitivamente.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className={erpBtnNeutral} onClick={onCancel} disabled={pending}>
            Annulla
          </button>
          <button type="button" className={dsBtnDanger} onClick={onConfirm} disabled={pending}>
            {pending ? "Eliminazione…" : "Elimina lavorazione"}
          </button>
        </div>
      </div>
    </LavorazioniModalShell>
  );
}
