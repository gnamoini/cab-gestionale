"use client";

import { GestionaleConfirmDialog, gestionaleConfirmActionsClass } from "@/components/gestionale/gestionale-confirm-dialog";
import { GestionaleModalFooterCancelButton } from "@/components/design-system";
import { erpBtnAccent } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { dsBtnNeutral } from "@/lib/ui/design-system";
import type { SchedaConcurrencyResolution } from "@/lib/schede/scheda-concurrency-merge";

export function SchedaConcurrencyMergeDialog({
  open,
  pending = false,
  onCancel,
  onResolve,
}: {
  open: boolean;
  pending?: boolean;
  onCancel: () => void;
  onResolve: (resolution: SchedaConcurrencyResolution) => void;
}) {
  return (
    <GestionaleConfirmDialog
      open={open}
      title="Conflitto di modifica"
      subtitle="Scheda ingresso"
      message="Un altro utente ha aggiornato questa scheda mentre stavi modificando. Scegli come procedere."
      layerClassName="z-[130]"
      cancelLabel="Annulla"
      pending={pending}
      onCancel={onCancel}
      footer={
        <div className={gestionaleConfirmActionsClass}>
          <GestionaleModalFooterCancelButton
            className="w-full sm:w-auto"
            disabled={pending}
            onClick={onCancel}
          />
          <button
            type="button"
            className={dsBtnNeutral}
            disabled={pending}
            onClick={() => onResolve("use-server")}
          >
            Usa versione server
          </button>
          <button
            type="button"
            className={dsBtnNeutral}
            disabled={pending}
            onClick={() => onResolve("merge-fields")}
          >
            Unisci campi
          </button>
          <button
            type="button"
            className={erpBtnAccent}
            disabled={pending}
            onClick={() => onResolve("keep-client")}
          >
            Mantieni mie modifiche
          </button>
        </div>
      }
    />
  );
}
