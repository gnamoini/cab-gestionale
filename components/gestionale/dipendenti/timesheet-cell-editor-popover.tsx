"use client";

import { useCallback, useMemo, useState } from "react";
import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import { cellValueToUpsert } from "@/lib/dipendenti/timesheet-entry-map";
import { normalizeCellValue } from "@/lib/dipendenti/timesheet-totals";
import { validateCellValue } from "@/lib/dipendenti/timesheet-validation";
import type { TimesheetCellValue, TimesheetEntryUpsert } from "@/lib/dipendenti/types";
import { TimesheetCellEditor } from "@/components/gestionale/dipendenti/timesheet-cell-editor";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { erpBtnAccent, erpBtnNeutral } from "@/components/report/report-buttons";

export function TimesheetCellEditorPopover({
  open,
  onClose,
  anchorLabel,
  dipendenteId,
  workDate,
  initialValue,
  tipiAssenza,
  readOnly,
  onSave,
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
  onSave: (input: TimesheetEntryUpsert) => void | Promise<void>;
  onScheduleSave?: (input: TimesheetEntryUpsert) => void;
  saving?: boolean;
}) {
  const [local, setLocal] = useState(initialValue);
  const [saveError, setSaveError] = useState<string | null>(null);

  const normalizedLocal = useMemo(() => normalizeCellValue(local), [local]);
  const validation = useMemo(
    () => validateCellValue(normalizedLocal, tipiAssenza),
    [normalizedLocal, tipiAssenza],
  );
  const canSave = !readOnly && !saving && validation.ok;

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

  if (!open) return null;

  return (
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
        <div className="flex min-w-0 shrink-0 justify-end gap-2">
          <button type="button" className={erpBtnNeutral} onClick={onClose} disabled={saving}>
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
    </GestionaleModalShell>
  );
}
