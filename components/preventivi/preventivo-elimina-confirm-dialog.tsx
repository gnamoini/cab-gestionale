"use client";

import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { dsBtnDanger, dsBtnNeutral } from "@/lib/ui/design-system";
import type { PreventivoRecord } from "@/lib/preventivi/types";

export function PreventivoEliminaConfirmDialog({
  open,
  record,
  onCancel,
  onConfirm,
  pending,
}: {
  open: boolean;
  record: PreventivoRecord | null;
  onCancel: () => void;
  onConfirm: () => void;
  pending?: boolean;
}) {
  if (!open || !record) return null;

  return (
    <LavorazioniModalShell onRequestClose={pending ? () => {} : onCancel} title="Eliminare preventivo?">
      <div className="p-4 sm:p-6">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          Stai per eliminare il preventivo <span className="font-semibold tabular-nums">{record.numero}</span>
          {record.cliente.trim() ? (
            <>
              {" "}
              del cliente <span className="font-semibold">{record.cliente}</span>
            </>
          ) : null}
          .
          <br />
          Questa operazione è irreversibile.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className={dsBtnNeutral} onClick={onCancel} disabled={pending}>
            Annulla
          </button>
          <button type="button" className={dsBtnDanger} onClick={onConfirm} disabled={pending}>
            {pending ? "Eliminazione…" : "Elimina preventivo"}
          </button>
        </div>
      </div>
    </LavorazioniModalShell>
  );
}
