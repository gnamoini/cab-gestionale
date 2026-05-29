"use client";

import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";

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
  return (
    <GestionaleConfirmDialog
      open={open}
      title="Eliminare lavorazione?"
      message={
        <>
          Questa operazione è irreversibile.
          <br />
          La lavorazione verrà eliminata definitivamente.
        </>
      }
      confirmLabel={pending ? "Eliminazione…" : "Elimina lavorazione"}
      destructive
      pending={pending}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
