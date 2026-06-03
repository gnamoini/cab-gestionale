"use client";

import { DipendentiInserimentoSection } from "@/components/gestionale/dipendenti/dipendenti-inserimento-section";
import { DipendentiSchedaSection } from "@/components/gestionale/dipendenti/dipendenti-scheda-section";
import { TimesheetEmptyState } from "@/components/gestionale/dipendenti/timesheet-empty-state";
import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import type {
  DipendenteTimesheetEmployeeRow,
  DipendenteTimesheetEntryRow,
  TimesheetCellValue,
  TimesheetEntryUpsert,
  TimesheetMonthKey,
} from "@/lib/dipendenti/types";

export function EmployeeTimesheetDetailView({
  monthKey,
  monthLabel,
  filterEmployeeId,
  employees,
  entries,
  tipiAssenza,
  hasAddetti,
  hasEntries,
  readOnly,
  getCellValue,
  onScheduleSave,
  onSaveNow,
  onOpenDetail,
}: {
  monthKey: TimesheetMonthKey;
  monthLabel: string;
  filterEmployeeId: string;
  employees: readonly DipendenteTimesheetEmployeeRow[];
  entries: readonly DipendenteTimesheetEntryRow[];
  tipiAssenza: readonly TipoAssenzaConfig[];
  hasAddetti: boolean;
  hasEntries: boolean;
  readOnly: boolean;
  getCellValue: (dipendenteId: string, workDate: string) => TimesheetCellValue;
  onScheduleSave: (input: TimesheetEntryUpsert) => void;
  onSaveNow: (input: TimesheetEntryUpsert) => void | Promise<void>;
  onOpenDetail: (employee: DipendenteTimesheetEmployeeRow) => void;
}) {
  if (!filterEmployeeId) {
    return <TimesheetEmptyState variant="select-employee" />;
  }

  return (
    <div className="flex-safe-col min-w-0 max-w-full gap-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-[color:var(--cab-text)]">Registrazione presenze</h3>
        <DipendentiInserimentoSection
          monthKey={monthKey}
          employees={employees}
          filterEmployeeId={filterEmployeeId}
          getCellValue={getCellValue}
          tipiAssenza={tipiAssenza}
          readOnly={readOnly}
          hasAddetti={hasAddetti}
          onScheduleSave={onScheduleSave}
          onSaveNow={onSaveNow}
        />
        {!hasEntries ? (
          <div className="mt-4">
            <TimesheetEmptyState variant="no-entries" monthLabel={monthLabel} />
          </div>
        ) : null}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-[color:var(--cab-text)]">Riepilogo mese e storico</h3>
        <DipendentiSchedaSection
          monthKey={monthKey}
          employees={employees}
          filterEmployeeId={filterEmployeeId}
          entries={entries}
          tipiAssenza={tipiAssenza}
          hasAddetti={hasAddetti}
          onOpenDetail={onOpenDetail}
        />
      </div>
    </div>
  );
}
