"use client";

import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import { captureSchedaTipoLabel } from "@/lib/document-capture/capture-existing-scheda-presence";
import { cabModalZConfirm } from "@/lib/ui/mobile-modal-behavior";
import { dsBtnDanger, dsBtnNeutral } from "@/lib/ui/design-system";
import type { SchedaTipo } from "@/types/schede";

export function CaptureExistingSchedaConfirmDialog({
  open,
  schedaTipo,
  targetLabel,
  onBack,
  onViewExisting,
  onOverwrite,
}: {
  open: boolean;
  schedaTipo: SchedaTipo;
  targetLabel: string;
  onBack: () => void;
  onViewExisting: () => void;
  onOverwrite: () => void;
}) {
  const schedaLabel = captureSchedaTipoLabel(schedaTipo);

  return (
    <GestionaleConfirmDialog
      open={open}
      title="Scheda già presente"
      subtitle={schedaLabel}
      message={
        <>
          Su <span className="font-medium text-[color:var(--cab-fg)]">{targetLabel}</span> è già salvata una{" "}
          {schedaLabel.toLowerCase()}.
          <br />
          <br />
          Vuoi visualizzare quella esistente o sostituirla con i dati letti dalla scansione?
        </>
      }
      cancelLabel="Torna indietro"
      layerClassName={cabModalZConfirm}
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={`${dsBtnNeutral} min-h-10`} onClick={onBack}>
            Torna indietro
          </button>
          <button type="button" className="erp-btn erp-btn-secondary min-h-10" onClick={onViewExisting}>
            Visualizza esistente
          </button>
          <button type="button" className={`${dsBtnDanger} min-h-10`} onClick={onOverwrite}>
            Sovrascrivi
          </button>
        </div>
      }
      onCancel={onBack}
      onConfirm={() => {}}
    />
  );
}
