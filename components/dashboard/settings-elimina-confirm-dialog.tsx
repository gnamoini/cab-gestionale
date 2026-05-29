"use client";

import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";

export function SettingsEliminaConfirmDialog({
  open,
  itemLabel,
  detail,
  onCancel,
  onConfirm,
  pending,
  confirmLabel = "Elimina",
}: {
  open: boolean;
  itemLabel?: string;
  detail?: string;
  onCancel: () => void;
  onConfirm: () => void;
  pending?: boolean;
  confirmLabel?: string;
}) {
  const title = itemLabel ? `Eliminare «${itemLabel}»?` : "Eliminare elemento?";
  const message = (
    <>
      Sei sicuro di voler eliminare questo elemento?
      {detail ? (
        <>
          <br />
          <span className="mt-2 block text-[color:var(--cab-text-muted)]">{detail}</span>
        </>
      ) : null}
    </>
  );

  return (
    <GestionaleConfirmDialog
      open={open}
      title={title}
      message={message}
      confirmLabel={confirmLabel}
      cancelLabel="Annulla"
      destructive
      pending={pending}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
