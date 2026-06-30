"use client";

import { useMemo } from "react";
import { DipendentiEmptyState } from "@/components/gestionale/dipendenti/dipendenti-empty-state";
import type { TimesheetDayInfo } from "@/lib/dipendenti/timesheet-month";
import { computeMonthTotals } from "@/lib/dipendenti/timesheet-totals";
import { formatCellShortLabel } from "@/lib/dipendenti/timesheet-cell-display";
import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import type {
  DipendenteTimesheetEmployeeRow,
  DipendenteTimesheetEntryRow,
  TimesheetCellValue,
} from "@/lib/dipendenti/types";
import { dsSurfaceCard, dsTypoSmall } from "@/lib/ui/design-system";

function MobileEmployeeTotals({
  entries,
  employeeId,
}: {
  entries: readonly DipendenteTimesheetEntryRow[];
  employeeId: string;
}) {
  const totals = useMemo(
    () => computeMonthTotals(entries.filter((e) => e.dipendente_id === employeeId)),
    [entries, employeeId],
  );

  return (
    <div className="grid grid-cols-4 gap-1 border-t border-[color:var(--cab-border)] pt-2 text-center text-[10px]">
      <div>
        <p className="text-[color:var(--cab-text-muted)]">Ord.</p>
        <p className="font-semibold tabular-nums">{totals.oreOrdinarie}</p>
      </div>
      <div>
        <p className="text-[color:var(--cab-text-muted)]">Str.</p>
        <p className="font-semibold tabular-nums">{totals.oreStraordinarie}</p>
      </div>
      <div>
        <p className="text-[color:var(--cab-text-muted)]">Ass.</p>
        <p className="font-semibold tabular-nums">{totals.oreAssenza}</p>
      </div>
      <div>
        <p className="text-[color:var(--cab-text-muted)]">Lav.</p>
        <p className="font-semibold tabular-nums">{totals.totaleLavorato}</p>
      </div>
    </div>
  );
}

function MobileEmployeeDaySection({
  employee,
  days,
  getCellValue,
  onDayClick,
  entries,
  tipiAssenza,
  readOnly,
  onEmployeeClick,
  compactHeader,
  scrollableList,
}: {
  employee: DipendenteTimesheetEmployeeRow;
  days: readonly TimesheetDayInfo[];
  getCellValue: (dipendenteId: string, workDate: string) => TimesheetCellValue;
  onDayClick: (dipendenteId: string, workDate: string) => void;
  entries: readonly DipendenteTimesheetEntryRow[];
  tipiAssenza: readonly TipoAssenzaConfig[];
  readOnly?: boolean;
  onEmployeeClick?: (employee: DipendenteTimesheetEmployeeRow) => void;
  compactHeader?: boolean;
  scrollableList?: boolean;
}) {
  const listClass = scrollableList
    ? "max-h-[min(50vh,28rem)] space-y-1 overflow-y-auto gestionale-scrollbar"
    : "space-y-1";

  return (
    <section className="min-w-0 space-y-2">
      {onEmployeeClick ? (
        <button
          type="button"
          onClick={() => onEmployeeClick(employee)}
          className="text-left text-sm font-semibold text-[color:var(--cab-text)] underline-offset-2 hover:underline"
        >
          {employee.display_name}
        </button>
      ) : compactHeader ? (
        <p className={`${dsTypoSmall} text-[color:var(--cab-text-muted)]`}>
          Giorni del mese per{" "}
          <strong className="text-[color:var(--cab-text)]">{employee.display_name}</strong>
        </p>
      ) : null}

      <ul className={listClass}>
        {days.map((d) => {
          const value = getCellValue(employee.id, d.dateYmd);
          const badge = formatCellShortLabel(value, tipiAssenza);
          return (
            <li key={d.dateYmd}>
              <button
                type="button"
                disabled={readOnly}
                onClick={() => onDayClick(employee.id, d.dateYmd)}
                className={`${dsSurfaceCard} flex min-w-0 w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-[var(--cab-hover)]`}
              >
                <span className="min-w-0 truncate text-sm">
                  <span className="font-medium tabular-nums">{String(d.day).padStart(2, "0")}</span>
                  <span className="ml-2 text-[color:var(--cab-text-muted)]">{d.weekdayShort}</span>
                </span>
                <span className="rounded bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,transparent)] px-2 py-0.5 text-xs font-semibold tabular-nums">
                  {badge || "—"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <MobileEmployeeTotals entries={entries} employeeId={employee.id} />
    </section>
  );
}

export function DipendentiMobileDayList({
  periodDays,
  employees,
  filterEmployeeId,
  getCellValue,
  onDayClick,
  onEmployeeClick,
  entries,
  tipiAssenza,
  readOnly,
}: {
  periodDays: readonly TimesheetDayInfo[];
  employees: readonly DipendenteTimesheetEmployeeRow[];
  filterEmployeeId: string;
  getCellValue: (dipendenteId: string, workDate: string) => TimesheetCellValue;
  onDayClick: (dipendenteId: string, workDate: string) => void;
  onEmployeeClick: (employee: DipendenteTimesheetEmployeeRow) => void;
  entries: readonly DipendenteTimesheetEntryRow[];
  tipiAssenza: readonly TipoAssenzaConfig[];
  readOnly?: boolean;
}) {
  const selected = filterEmployeeId ? (employees.find((e) => e.id === filterEmployeeId) ?? null) : null;

  if (filterEmployeeId && !selected) {
    return (
      <div className="gestionale-list-mobile-only">
        <DipendentiEmptyState variant="select-employee" />
      </div>
    );
  }

  if (selected) {
    return (
      <div className="space-y-3 gestionale-list-mobile-only">
        <MobileEmployeeDaySection
          employee={selected}
          days={periodDays}
          getCellValue={getCellValue}
          onDayClick={onDayClick}
          entries={entries}
          tipiAssenza={tipiAssenza}
          readOnly={readOnly}
          compactHeader
          scrollableList
        />
      </div>
    );
  }

  if (employees.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 gestionale-list-mobile-only">
      <p className={`${dsTypoSmall} text-[color:var(--cab-text-muted)]`}>
        Presenze del mese — tutti i dipendenti
      </p>
      {employees.map((employee) => (
        <MobileEmployeeDaySection
          key={employee.id}
          employee={employee}
          days={periodDays}
          getCellValue={getCellValue}
          onDayClick={onDayClick}
          entries={entries}
          tipiAssenza={tipiAssenza}
          readOnly={readOnly}
          onEmployeeClick={onEmployeeClick}
        />
      ))}
    </div>
  );
}
