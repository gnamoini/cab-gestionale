"use client";

import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { erpBtnNeutral } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { dsBtnPrimary } from "@/lib/ui/design-system";

export function LavorazioneConcludiConfirmDialog({
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
      title="Conferma conclusione lavorazione"
    >
      <div className="p-4 sm:p-6">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          La lavorazione verrà spostata nell&apos;archivio. Vuoi continuare?
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className={erpBtnNeutral} onClick={onCancel} disabled={pending}>
            Annulla
          </button>
          <button type="button" className={dsBtnPrimary} onClick={onConfirm} disabled={pending}>
            {pending ? "Conclusione…" : "Conferma"}
          </button>
        </div>
      </div>
    </LavorazioniModalShell>
  );
}
