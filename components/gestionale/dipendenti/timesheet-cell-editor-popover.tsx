"use client";

import { useCallback, useMemo, useState } from "react";
import { GestionaleConfirmDialog } from "@/components/gestionale/gestionale-confirm-dialog";
import { TimesheetCellEditor } from "@/components/gestionale/dipendenti/timesheet-cell-editor";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { erpBtnAccent, erpBtnNeutral } from "@/components/report/report-buttons";
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
        onRequestClose={onClose}
        title="Modifica cella"
        subtitle={anchorLabel}
      >
        <div className="space-y-3 px-4 py-3">
          <TimesheetCellEditor
            value={local}
            onChange={handleChange}
            tipiAssenza={tipiAssenza}
            readOnly={readOnly}
          />
        </div>
        <div className="space-y-3 border-t border-[color:var(--cab-border)] px-4 py-3">
          {saveError ? (
            <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">
              {saveError}
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            {!readOnly && employees.length > 1 && onCopyToAll ? (
              <button
                type="button"
                className={`${erpBtnNeutral} min-h-11 w-full touch-manipulation`}
                onClick={() => setCopyConfirmOpen(true)}
                disabled={!canCopyToAll}
                title={!validation.ok ? validation.errors[0] : undefined}
              >
                Copia per tutti
              </button>
            ) : null}
            <div className="flex min-w-0 shrink-0 justify-end gap-2">
              <button type="button" className={erpBtnNeutral} onClick={onClose} disabled={saving || copyPending}>
                Annulla
              </button>
              <button
                type="button"
                className={erpBtnAccent}
                onClick={() => void handleSaveNow()}
                disabled={!canSave}
                title={!validation.ok ? validation.errors[0] : undefined}
              >
                {saving ? "Salvataggio…" : "Salva"}
              </button>
            </div>
          </div>
        </div>
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
