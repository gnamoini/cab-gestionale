"use client";

import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import { invoiceDisplayNumber } from "@/lib/fatturazione/fatturazione-list-ui-filters";
import type { InvoiceRow } from "@/src/types/supabase-tables";

export function FatturaEliminaConfirmDialog({
  open,
  invoice,
  onCancel,
  onConfirm,
  pending,
}: {
  open: boolean;
  invoice: InvoiceRow | null;
  onCancel: () => void;
  onConfirm: () => void;
  pending?: boolean;
}) {
  if (!invoice) return null;

  return (
    <GestionaleConfirmDialog
      open={open}
      title="Eliminare fattura?"
      message={
        <>
          Stai per eliminare definitivamente la fattura{" "}
          <span className="font-semibold tabular-nums">{invoiceDisplayNumber(invoice)}</span>
          {invoice.cliente_label.trim() ? (
            <>
              {" "}
              del cliente <span className="font-semibold">{invoice.cliente_label}</span>
            </>
          ) : null}
          .
          <br />
          Righe, collegamenti e identificativo verranno rimossi dal database. Operazione irreversibile.
        </>
      }
      confirmLabel={pending ? "Eliminazione…" : "Elimina fattura"}
      destructive
      pending={pending}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
