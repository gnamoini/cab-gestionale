"use client";

import { GestionaleConfirmDialog, gestionaleConfirmActionsClass } from "@/components/gestionale/gestionale-confirm-dialog";
import { erpBtnAccent } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { dsBtnNeutral } from "@/lib/ui/design-system";
import { cabModalZConfirm } from "@/lib/ui/mobile-modal-behavior";

export function CaptureUnsavedChangesDialog({
  open,
  pending = false,
  onCancel,
  onSaveAndContinue,
  onContinueWithoutSave,
}: {
  open: boolean;
  pending?: boolean;
  onCancel: () => void;
  onSaveAndContinue: () => void;
  onContinueWithoutSave: () => void;
}) {
  return (
    <GestionaleConfirmDialog
      open={open}
      title="Modifiche non salvate"
      subtitle="Hai modificato alcuni campi nella revisione dati."
      message="Vuoi salvarle prima di proseguire? Se continui senza salvare, le modifiche non verranno applicate."
      layerClassName={cabModalZConfirm}
      onCancel={onCancel}
      footer={
        <div className={gestionaleConfirmActionsClass}>
          <button type="button" className={`${dsBtnNeutral} min-h-[2.75rem] sm:min-h-0`} onClick={onCancel} disabled={pending}>
            Annulla
          </button>
          <button
            type="button"
            className={`${dsBtnNeutral} min-h-[2.75rem] sm:min-h-0`}
            onClick={onContinueWithoutSave}
            disabled={pending}
          >
            Prosegui senza salvare
          </button>
          <button type="button" className={`${erpBtnAccent} min-h-[2.75rem] sm:min-h-0`} onClick={onSaveAndContinue} disabled={pending}>
            {pending ? "Salvataggio…" : "Salva e prosegui"}
          </button>
        </div>
      }
    />
  );
}
