"use client";

import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";

export function SettingsSimileConfirmDialog({
  open,
  candidate,
  similarTo,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  candidate: string;
  similarTo: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <GestionaleConfirmDialog
      open={open}
      title="Elemento simile esistente"
      message={
        <>
          Esiste già un elemento simile: <span className="font-semibold">{similarTo}</span>
          <br />
          <span className="mt-2 block text-[color:var(--cab-text-muted)]">
            Stai inserendo: <span className="font-medium text-[color:var(--cab-text)]">{candidate}</span>
          </span>
        </>
      }
      confirmLabel="Inserisci comunque"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
