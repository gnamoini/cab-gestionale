"use client";

import { GestionaleConfirmDialog, gestionaleConfirmActionsClass } from "@/components/gestionale/gestionale-confirm-dialog";
import {
  GestionaleModalFooterCancelButton,
  GestionaleModalFooterDeleteButton,
} from "@/components/design-system";
import { cabModalZConfirm } from "@/lib/ui/mobile-modal-behavior";
import { dsBtnPrimary } from "@/lib/ui/design-system";
import { preventivoEsistenteConfirmMessage } from "@/lib/preventivi/preventivo-esistente-confirm-message";

export function PreventivoEsistenteConfirmDialog({
  open,
  existingCount,
  busy,
  onBack,
  onReplace,
  onCreateAnother,
}: {
  open: boolean;
  existingCount: number;
  busy?: boolean;
  onBack: () => void;
  onReplace: () => void;
  onCreateAnother: () => void;
}) {
  const intro = preventivoEsistenteConfirmMessage(existingCount);

  return (
    <GestionaleConfirmDialog
      open={open}
      title="Preventivo già presente"
      message={
        <>
          {intro}
          <br />
          <br />
          Vuoi sostituirlo eliminando quello esistente, crearne un altro mantenendo quello attuale, o tornare
          indietro?
        </>
      }
      cancelLabel="Torna indietro"
      layerClassName={cabModalZConfirm}
      footer={
        <div className={gestionaleConfirmActionsClass}>
          <GestionaleModalFooterCancelButton
            className="w-full sm:w-auto"
            disabled={busy}
            onClick={onBack}
          >
            Torna indietro
          </GestionaleModalFooterCancelButton>
          <GestionaleModalFooterDeleteButton
            className="w-full sm:w-auto"
            disabled={busy}
            onClick={onReplace}
          >
            Sostituisci
          </GestionaleModalFooterDeleteButton>
          <button
            type="button"
            className={`${dsBtnPrimary} min-h-11 w-full sm:w-auto`}
            disabled={busy}
            onClick={onCreateAnother}
          >
            Creane un altro
          </button>
        </div>
      }
      onCancel={onBack}
      onConfirm={() => {}}
    />
  );
}
