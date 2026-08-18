"use client";

import { useCallback, useMemo, useState } from "react";
import {
  GestionaleModalFooterActions,
  GestionaleModalFooterCancelButton,
  GestionaleModalFooterSaveButton,
  gestionaleModalFooterCancelBtnClass,
} from "@/components/design-system";
import { HubIconCopy } from "@/components/design-system/hub-table-action-icons";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import { TimesheetCellEditor } from "@/components/gestionale/dipendenti/timesheet-cell-editor";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import { buildCopyDayToAllUpserts } from "@/lib/dipendenti/timesheet-bulk-fill-day";
import { cellValueToUpsert } from "@/lib/dipendenti/timesheet-entry-map";
import { normalizeCellValue } from "@/lib/dipendenti/timesheet-totals";
import { validateCellValue } from "@/lib/dipendenti/timesheet-validation";
import type {
  DipendenteTimesheetEmployeeRow,
  TimesheetCellValue,
  TimesheetEntryUpsert,
} from "@/lib/dipendenti/types";

function formatWorkDateIt(dateYmd: string): string {
  const [y, m, d] = dateYmd.split("-");
  return `${d}/${m}/${y}`;
}

export function TimesheetCellEditorPopover({
  open,
  onClose,
  anchorLabel,
  dipendenteId,
  workDate,
  initialValue,
  tipiAssenza,
  readOnly,
  employees,
  onSave,
  onCopyToAll,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  anchorLabel: string;
  dipendenteId: string;
  workDate: string;
  initialValue: TimesheetCellValue;
  tipiAssenza: readonly TipoAssenzaConfig[];
  readOnly?: boolean;
  employees: readonly DipendenteTimesheetEmployeeRow[];
  onSave: (input: TimesheetEntryUpsert) => void | Promise<void>;
  onCopyToAll?: (upserts: TimesheetEntryUpsert[]) => void | Promise<void>;
  onScheduleSave?: (input: TimesheetEntryUpsert) => void;
  saving?: boolean;
}) {
  const [local, setLocal] = useState(initialValue);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copyConfirmOpen, setCopyConfirmOpen] = useState(false);
  const [copyPending, setCopyPending] = useState(false);

  const normalizedLocal = useMemo(() => normalizeCellValue(local), [local]);
  const validation = useMemo(
    () => validateCellValue(normalizedLocal, tipiAssenza),
    [normalizedLocal, tipiAssenza],
  );
  const canSave = !readOnly && !saving && !copyPending && validation.ok;
  const canCopyToAll =
    !readOnly &&
    !saving &&
    !copyPending &&
    validation.ok &&
    employees.length > 1 &&
    Boolean(onCopyToAll);

  const copyUpserts = useMemo(
    () => buildCopyDayToAllUpserts(employees, workDate, normalizedLocal, tipiAssenza),
    [employees, workDate, normalizedLocal, tipiAssenza],
  );

  const handleChange = useCallback((next: TimesheetCellValue) => {
    setSaveError(null);
    setLocal(next);
  }, []);

  const handleSaveNow = useCallback(async () => {
    if (readOnly || !validation.ok) return;
    setSaveError(null);
    try {
      await onSave(cellValueToUpsert(dipendenteId, workDate, normalizedLocal, tipiAssenza));
      onClose();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Salvataggio non riuscito.");
    }
  }, [readOnly, validation.ok, normalizedLocal, tipiAssenza, onSave, dipendenteId, workDate, onClose]);

  const handleConfirmCopyToAll = useCallback(async () => {
    if (!canCopyToAll || !onCopyToAll || copyUpserts.length === 0) {
      setCopyConfirmOpen(false);
      return;
    }
    setSaveError(null);
    setCopyPending(true);
    try {
      await onCopyToAll(copyUpserts);
      setCopyConfirmOpen(false);
      onClose();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Copia non riuscita.");
      setCopyConfirmOpen(false);
    } finally {
      setCopyPending(false);
    }
  }, [canCopyToAll, onCopyToAll, copyUpserts, onClose]);

  if (!open) return null;

  return (
    <>
      <GestionaleModalShell
        modalSize="formSmall"
        modalHeight="standard"
        onRequestClose={onClose}
        title="Modifica cella"
        subtitle={anchorLabel}
        footer={
          <div className="flex w-full min-w-0 flex-col gap-2">
            {saveError ? (
              <p className="w-full text-xs text-rose-600 dark:text-rose-400" role="alert">
                {saveError}
              </p>
            ) : null}
            <GestionaleModalFooterActions className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              {!readOnly && employees.length > 1 && onCopyToAll ? (
                <button
                  type="button"
                  className={`${gestionaleModalFooterCancelBtnClass} w-full shrink-0 justify-center sm:w-auto`}
                  onClick={() => setCopyConfirmOpen(true)}
                  disabled={!canCopyToAll}
                >
                  <HubIconCopy className="h-4 w-4 shrink-0" />
                  Copia per tutti
                </button>
              ) : null}
              <div className="flex w-full shrink-0 flex-col-reverse items-stretch gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:items-center">
                <GestionaleModalFooterCancelButton
                  className="w-full shrink-0 justify-center sm:w-auto"
                  onClick={onClose}
                  disabled={saving || copyPending}
                />
                <GestionaleModalFooterSaveButton
                  type="button"
                  className="w-full shrink-0 justify-center sm:w-auto"
                  loading={saving}
                  disabled={!canSave}
                  onClick={() => void handleSaveNow()}
                />
              </div>
            </GestionaleModalFooterActions>
          </div>
        }
      >
        <GestionaleModalScrollBody className="py-3">
          <TimesheetCellEditor
            value={local}
            onChange={handleChange}
            tipiAssenza={tipiAssenza}
            readOnly={readOnly}
          />
        </GestionaleModalScrollBody>
      </GestionaleModalShell>

      <GestionaleConfirmDialog
        open={copyConfirmOpen}
        title="Copia per tutti"
        message={`Applicare queste ore a tutti gli ${employees.length} addetti il ${formatWorkDateIt(workDate)}? I dati già inseriti per questo giorno verranno sovrascritti.`}
        confirmLabel={copyPending ? "Copia in corso…" : "Copia per tutti"}
        pending={copyPending}
        onCancel={() => {
          if (copyPending) return;
          setCopyConfirmOpen(false);
        }}
        onConfirm={() => void handleConfirmCopyToAll()}
      />
    </>
  );
}
