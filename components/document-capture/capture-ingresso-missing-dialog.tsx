"use client";

import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import { formatCaptureIdentSummary, type CaptureIdent } from "@/lib/document-capture/capture-lavorazione-match";

export function CaptureIngressoMissingDialog({
  open,
  schedaLabel,
  ident,
  onCancel,
  onCreateIngresso,
}: {
  open: boolean;
  schedaLabel: string;
  ident: CaptureIdent;
  onCancel: () => void;
  onCreateIngresso: () => void;
}) {
  return (
    <GestionaleConfirmDialog
      open={open}
      title="Scheda ingresso non trovata"
      subtitle={`Per importare la ${schedaLabel} serve una lavorazione in corso con scheda ingresso collegata.`}
      message={
        <>
          Nessuna lavorazione attiva con scheda ingresso corrispondente a{" "}
          <span className="font-medium text-[color:var(--cab-fg)]">{formatCaptureIdentSummary(ident)}</span>. Vuoi
          creare una nuova lavorazione con scheda ingresso?
        </>
      }
      confirmLabel="Crea scheda ingresso"
      cancelLabel="Torna ai dati"
      layerClassName="z-[120]"
      onCancel={onCancel}
      onConfirm={onCreateIngresso}
    />
  );
}
