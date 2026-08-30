"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DipendentiEmptyState } from "@/components/gestionale/dipendenti/dipendenti-empty-state";
import {
  TimesheetCellEditor,
  timesheetCellEditorValid,
} from "@/components/gestionale/dipendenti/timesheet-cell-editor";
import { GestionaleListTable, GestionaleListTableRow, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import { cellValueToUpsert } from "@/lib/dipendenti/timesheet-entry-map";
import { buildMonthDays } from "@/lib/dipendenti/timesheet-month";
import { isCellEmpty } from "@/lib/dipendenti/timesheet-totals";
import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import type {
  DipendenteTimesheetEmployeeRow,
  TimesheetCellValue,
  TimesheetEntryUpsert,
  TimesheetMonthKey,
} from "@/lib/dipendenti/types";
import { gestionaleListTableTd } from "@/lib/ui/gestionale-list-table";
import { dsSurfaceCard, dsTypoSmall } from "@/lib/ui/design-system";
import type { ListSurface } from "@/lib/ui/resolve-list-surface";

function DayInserimentoRow({
  dateYmd,
  dayLabel,
  weekdayShort,
  isWeekend,
  value,
  tipiAssenza,
  readOnly,
  onChange,
  onBlurSave,
}: {
  dateYmd: string;
  dayLabel: string;
  weekdayShort: string;
  isWeekend: boolean;
  value: TimesheetCellValue;
  tipiAssenza: readonly TipoAssenzaConfig[];
  readOnly?: boolean;
  onChange: (dateYmd: string, next: TimesheetCellValue) => void;
  onBlurSave: (dateYmd: string, value: TimesheetCellValue) => void;
}) {
  return (
    <GestionaleListTableRow className={isWeekend ? "opacity-90" : undefined}>
      <td className={`${gestionaleListTableTd} whitespace-nowrap tabular-nums`}>
        <span className="font-medium">{dayLabel}</span>
        <span className="ml-2 text-[color:var(--cab-text-muted)]">{weekdayShort}</span>
      </td>
      <td className={gestionaleListTableTd} colSpan={1}>
        <div
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              onBlurSave(dateYmd, value);
            }
          }}
        >
          <TimesheetCellEditor
            value={value}
            onChange={(next) => onChange(dateYmd, next)}
            tipiAssenza={tipiAssenza}
            readOnly={readOnly}
            compact
          />
        </div>
      </td>
    </GestionaleListTableRow>
  );
}

export function DipendentiInserimentoSection({
  listSurface,
  monthKey,
  employees,
  filterEmployeeId,
  getCellValue,
  tipiAssenza,
  readOnly,
  hasAddetti,
  onScheduleSave,
  onSaveNow,
}: {
  listSurface: ListSurface;
  monthKey: TimesheetMonthKey;
  employees: readonly DipendenteTimesheetEmployeeRow[];
  filterEmployeeId: string;
  getCellValue: (dipendenteId: string, workDate: string) => TimesheetCellValue;
  tipiAssenza: readonly TipoAssenzaConfig[];
  readOnly?: boolean;
  hasAddetti: boolean;
  onScheduleSave: (input: TimesheetEntryUpsert) => void;
  onSaveNow: (input: TimesheetEntryUpsert) => void | Promise<void>;
}) {
  const days = useMemo(() => buildMonthDays(monthKey), [monthKey]);

  const targetEmployee = useMemo(() => {
    if (filterEmployeeId) {
      const selected = employees.find((e) => e.id === filterEmployeeId);
      return selected?.in_settings ? selected : selected ?? null;
    }
    return employees.find((e) => e.in_settings) ?? null;
  }, [employees, filterEmployeeId]);

  const [localByDate, setLocalByDate] = useState<Map<string, TimesheetCellValue>>(new Map());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
    setLocalByDate(new Map());
  }, [monthKey, targetEmployee?.id]);

  const getValue = useCallback(
    (dateYmd: string): TimesheetCellValue => {
      if (!targetEmployee) return getCellValue("", dateYmd);
      return localByDate.get(dateYmd) ?? getCellValue(targetEmployee.id, dateYmd);
    },
    [localByDate, getCellValue, targetEmployee],
  );

  const tryPersist = useCallback(
    (dateYmd: string, value: TimesheetCellValue, immediate: boolean) => {
      if (!targetEmployee || readOnly) return;
      const upsert = cellValueToUpsert(targetEmployee.id, dateYmd, value, tipiAssenza);
      if (isCellEmpty(value)) {
        if (immediate) void onSaveNow(upsert);
        else onScheduleSave(upsert);
        return;
      }
      if (!timesheetCellEditorValid(value, tipiAssenza)) return;
      if (immediate) void onSaveNow(upsert);
      else onScheduleSave(upsert);
    },
    [targetEmployee, readOnly, tipiAssenza, onSaveNow, onScheduleSave],
  );

  const handleChange = useCallback(
    (dateYmd: string, next: TimesheetCellValue) => {
      setLocalByDate((prev) => new Map(prev).set(dateYmd, next));
      tryPersist(dateYmd, next, false);
    },
    [tryPersist],
  );

  const handleBlurSave = useCallback(
    (dateYmd: string, value: TimesheetCellValue) => {
      tryPersist(dateYmd, value, true);
    },
    [tryPersist],
  );

  if (!hasAddetti) {
    return <DipendentiEmptyState variant="no-addetti" />;
  }

  if (employees.length === 0) {
    return <DipendentiEmptyState variant="no-employees" readOnly={readOnly} />;
  }

  if (!targetEmployee) {
    return <DipendentiEmptyState variant="select-employee" />;
  }

  return (
    <div className="space-y-4 min-w-0 max-w-full">
      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[color:var(--cab-text)]">
          Dipendente: <strong>{targetEmployee.display_name}</strong>
          {!filterEmployeeId ? (
            <span className="ml-1 text-[color:var(--cab-text-muted)]">(filtra nella toolbar per cambiare)</span>
          ) : null}
        </p>
        <p className={`${dsTypoSmall} text-[color:var(--cab-text-muted)]`}>
          Compila ore e assenze — salvataggio automatico
        </p>
      </div>

      {listSurface === "table" ? (
      <div>
        <GestionaleListTable
          masterScrollScope
          colSpan={2}
          headRow={
            <>
              <GlobalTableHeadLabel label="Giorno" thClassName="min-w-[6rem]" />
              <GlobalTableHeadLabel label="Ore / assenza / note" />
            </>
          }
        >
          {days.map((d) => (
            <DayInserimentoRow
              key={d.dateYmd}
              dateYmd={d.dateYmd}
              dayLabel={String(d.day).padStart(2, "0")}
              weekdayShort={d.weekdayShort}
              isWeekend={d.isWeekend}
              value={getValue(d.dateYmd)}
              tipiAssenza={tipiAssenza}
              readOnly={readOnly}
              onChange={handleChange}
              onBlurSave={handleBlurSave}
            />
          ))}
        </GestionaleListTable>
      </div>
      ) : (
      <ul className="max-h-[min(60vh,32rem)] space-y-2 overflow-y-auto gestionale-scrollbar">
        {days.map((d) => (
          <li key={d.dateYmd}>
            <div className={`${dsSurfaceCard} px-3 py-3`}>
              <p className="mb-2 text-sm font-medium tabular-nums text-[color:var(--cab-text)]">
                {String(d.day).padStart(2, "0")}{" "}
                <span className="font-normal text-[color:var(--cab-text-muted)]">{d.weekdayShort}</span>
              </p>
              <div
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    handleBlurSave(d.dateYmd, getValue(d.dateYmd));
                  }
                }}
              >
                <TimesheetCellEditor
                  value={getValue(d.dateYmd)}
                  onChange={(next) => handleChange(d.dateYmd, next)}
                  tipiAssenza={tipiAssenza}
                  readOnly={readOnly}
                  compact
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
      )}
    </div>
  );
}
