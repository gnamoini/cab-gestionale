"use client";

import {
  GestionaleConfirmDialog,
  gestionaleConfirmActionsClass,
} from "@/components/gestionale/gestionale-confirm-dialog";
import {
  GestionaleListTable,
  GestionaleListTableRow,
} from "@/components/gestionale/global-table";
import { GlobalTableHeadLabel } from "@/components/gestionale/global-table/global-table-header";
import type { MezzoAnagraficaChange } from "@/lib/domain/mezzo/detect-mezzo-anagrafica-changes";
import {
  GestionaleModalFooterCancelButton,
  GestionaleModalFooterSaveButton,
} from "@/components/design-system";
import { cabModalZConfirm } from "@/lib/ui/mobile-modal-behavior";
import { gestionaleListTableTd } from "@/lib/ui/gestionale-list-table";

export function MezzoAnagraficaConfirmDialog({
  open,
  changes,
  mezzoStale,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  changes: MezzoAnagraficaChange[];
  mezzoStale: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <GestionaleConfirmDialog
      open={open}
      title="Aggiornamento anagrafica mezzo"
      layerClassName={cabModalZConfirm}
      onCancel={onCancel}
      footer={
        <div className={gestionaleConfirmActionsClass}>
          <GestionaleModalFooterCancelButton className="w-full sm:w-auto" onClick={onCancel}>
            Torna alla modifica
          </GestionaleModalFooterCancelButton>
          <GestionaleModalFooterSaveButton type="button" className="w-full sm:w-auto" onClick={onConfirm}>
            Conferma e salva
          </GestionaleModalFooterSaveButton>
        </div>
      }
    >
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        Sono state rilevate modifiche all&apos;anagrafica del mezzo collegato.
      </p>
      {mezzoStale ? (
        <p className="mt-2 text-sm font-medium text-amber-700 dark:text-amber-400">
          Il mezzo è stato modificato da un altro utente dopo il collegamento.
        </p>
      ) : null}
      {changes.length > 0 ? (
        <div className="mt-4">
          <GestionaleListTable
            masterScrollScope={false}
            wrapClassName="max-h-[min(50vh,20rem)]"
            headRow={
              <>
                <GlobalTableHeadLabel label="Campo" />
                <GlobalTableHeadLabel label="Valore precedente" />
                <GlobalTableHeadLabel label="Nuovo valore" />
              </>
            }
          >
            {changes.map((row) => (
              <GestionaleListTableRow key={row.field}>
                <td className={gestionaleListTableTd}>{row.label}</td>
                <td className={gestionaleListTableTd}>{row.oldValue}</td>
                <td className={gestionaleListTableTd}>
                  → {row.newValue}
                </td>
              </GestionaleListTableRow>
            ))}
          </GestionaleListTable>
        </div>
      ) : null}
    </GestionaleConfirmDialog>
  );
}

/** @deprecated Usare MezzoAnagraficaConfirmDialog */
export const SchedaSaveConflictDialog = MezzoAnagraficaConfirmDialog;
