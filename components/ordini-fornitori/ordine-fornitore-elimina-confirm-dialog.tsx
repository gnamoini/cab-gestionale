"use client";

import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";

export function OrdineFornitoreEliminaConfirmDialog({
  open,
  record,
  onCancel,
  onConfirm,
  pending,
}: {
  open: boolean;
  record: OrdineFornitoreRecord | null;
  onCancel: () => void;
  onConfirm: () => void;
  pending?: boolean;
}) {
  if (!record) return null;

  return (
    <GestionaleConfirmDialog
      open={open}
      title="Eliminare ordine?"
      message={
        <>
          Stai per eliminare definitivamente l&apos;ordine{" "}
          <span className="font-semibold tabular-nums">{record.numero || "—"}</span>
          {record.fornitoreLabel.trim() ? (
            <>
              {" "}
              del fornitore <span className="font-semibold">{record.fornitoreLabel}</span>
            </>
          ) : null}
          .
          <br />
          Righe, collegamenti e allegati verranno rimossi dal database. Operazione irreversibile.
        </>
      }
      confirmLabel={pending ? "Eliminazione…" : "Elimina ordine"}
      destructive
      pending={pending}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
