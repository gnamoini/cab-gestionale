"use client";

import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
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
  if (!record) return null;

  return (
    <GestionaleConfirmDialog
      open={open}
      title="Eliminare preventivo?"
      message={
        <>
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
        </>
      }
      confirmLabel={pending ? "Eliminazione…" : "Elimina preventivo"}
      destructive
      pending={pending}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
