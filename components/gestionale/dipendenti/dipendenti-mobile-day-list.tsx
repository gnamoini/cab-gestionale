"use client";

import { useMemo } from "react";
import { DipendentiEmptyState } from "@/components/gestionale/dipendenti/dipendenti-empty-state";
import { buildMonthDays } from "@/lib/dipendenti/timesheet-month";
import { computeMonthTotals } from "@/lib/dipendenti/timesheet-totals";
import { formatCellShortLabel } from "@/lib/dipendenti/timesheet-cell-display";
import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import type {
  DipendenteTimesheetEmployeeRow,
  DipendenteTimesheetEntryRow,
  TimesheetCellValue,
  TimesheetMonthKey,
} from "@/lib/dipendenti/types";
import { dsSurfaceCard, dsTypoSmall } from "@/lib/ui/design-system";

export function DipendentiMobileDayList({
  monthKey,
  employees,
  filterEmployeeId,
  getCellValue,
  onDayClick,
  entries,
  tipiAssenza,
  readOnly,
}: {
  monthKey: TimesheetMonthKey;
  employees: readonly DipendenteTimesheetEmployeeRow[];
  filterEmployeeId: string;
  getCellValue: (dipendenteId: string, workDate: string) => TimesheetCellValue;
  onDayClick: (dipendenteId: string, workDate: string) => void;
  entries: readonly DipendenteTimesheetEntryRow[];
  tipiAssenza: readonly TipoAssenzaConfig[];
  readOnly?: boolean;
}) {
  const days = useMemo(() => buildMonthDays(monthKey), [monthKey]);
  const selected = employees.find((e) => e.id === filterEmployeeId) ?? null;
  const totals = useMemo(
    () => (selected ? computeMonthTotals(entries.filter((e) => e.dipendente_id === selected.id)) : null),
    [selected, entries],
  );

  if (!selected) {
    return (
      <div className="md:hidden">
        <DipendentiEmptyState variant="select-employee" />
      </div>
    );
  }

  return (
    <div className="space-y-3 md:hidden">
      <p className={`${dsTypoSmall} text-[color:var(--cab-text-muted)]`}>
        Giorni del mese per <strong className="text-[color:var(--cab-text)]">{selected.display_name}</strong>
      </p>

      <ul className="max-h-[min(50vh,28rem)] space-y-1 overflow-y-auto gestionale-scrollbar">
        {days.map((d) => {
          const value = getCellValue(selected.id, d.dateYmd);
          const badge = formatCellShortLabel(value, tipiAssenza);
          return (
            <li key={d.dateYmd}>
              <button
                type="button"
                disabled={readOnly}
                onClick={() => onDayClick(selected.id, d.dateYmd)}
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

      {totals ? (
        <div className="sticky bottom-0 grid grid-cols-4 gap-1 border-t border-[color:var(--cab-border)] bg-[var(--cab-card)] pt-2 text-center text-[10px]">
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
      ) : null}
    </div>
  );
}
