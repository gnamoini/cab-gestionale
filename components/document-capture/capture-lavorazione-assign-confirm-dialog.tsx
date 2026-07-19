"use client";

import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import {
  formatCaptureIdentSummary,
  type CaptureIdent,
} from "@/lib/document-capture/capture-lavorazione-match";
import { cabModalZConfirm } from "@/lib/ui/mobile-modal-behavior";

export function CaptureLavorazioneAssignConfirmDialog({
  open,
  schedaLabel,
  targetLabel,
  captureIdent,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  schedaLabel: string;
  targetLabel: string;
  captureIdent: CaptureIdent;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <GestionaleConfirmDialog
      open={open}
      title="Conferma lavorazione"
      subtitle={`Verifica che la ${schedaLabel} vada associata alla lavorazione corretta.`}
      message={
        <>
          Dati letti dalla scheda:{" "}
          <span className="font-medium text-[color:var(--cab-fg)]">{formatCaptureIdentSummary(captureIdent)}</span>
          <br />
          <br />
          Lavorazione trovata:{" "}
          <span className="font-medium text-[color:var(--cab-fg)]">{targetLabel}</span>. Confermi?
        </>
      }
      confirmLabel="Sì, assegna"
      cancelLabel="Torna ai dati"
      layerClassName={cabModalZConfirm}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
