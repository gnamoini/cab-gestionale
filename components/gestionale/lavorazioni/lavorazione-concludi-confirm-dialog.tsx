"use client";

import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";

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
  return (
    <GestionaleConfirmDialog
      open={open}
      title="Conferma conclusione lavorazione"
      message="La lavorazione verrà spostata nell'archivio. Vuoi continuare?"
      confirmLabel={pending ? "Conclusione…" : "Conferma"}
      pending={pending}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
