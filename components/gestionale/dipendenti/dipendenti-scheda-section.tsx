"use client";

import { useMemo } from "react";
import { DipendentiEmptyState } from "@/components/gestionale/dipendenti/dipendenti-empty-state";
import { DipendentiStoricoSection } from "@/components/gestionale/dipendenti/dipendenti-storico-section";
import { buildMonthDays, formatMonthLabel } from "@/lib/dipendenti/timesheet-month";
import { computeDipendenteSchedaStats } from "@/lib/dipendenti/timesheet-scheda-stats";
import { computeMonthTotals, entryToCellValue } from "@/lib/dipendenti/timesheet-totals";
import { formatCellShortLabel } from "@/lib/dipendenti/timesheet-cell-display";
import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import type {
  DipendenteTimesheetEmployeeRow,
  DipendenteTimesheetEntryRow,
  TimesheetMonthKey,
} from "@/lib/dipendenti/types";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import { gestionaleListTableClass, gestionaleListTableTd } from "@/lib/ui/gestionale-list-table";
import { dsPageToolbarBtn } from "@/lib/ui/design-system";

export function DipendentiSchedaSection({
  monthKey,
  employees,
  filterEmployeeId,
  entries,
  tipiAssenza,
  hasAddetti,
  onOpenDetail,
}: {
  monthKey: TimesheetMonthKey;
  employees: readonly DipendenteTimesheetEmployeeRow[];
  filterEmployeeId: string;
  entries: readonly DipendenteTimesheetEntryRow[];
  tipiAssenza: readonly TipoAssenzaConfig[];
  hasAddetti: boolean;
  onOpenDetail: (employee: DipendenteTimesheetEmployeeRow) => void;
}) {
  const employee = useMemo(
    () => (filterEmployeeId ? employees.find((e) => e.id === filterEmployeeId) ?? null : null),
    [employees, filterEmployeeId],
  );

  const empEntries = useMemo(
    () => (employee ? entries.filter((e) => e.dipendente_id === employee.id) : []),
    [employee, entries],
  );

  const totals = useMemo(() => computeMonthTotals(empEntries), [empEntries]);
  const schedaStats = useMemo(() => computeDipendenteSchedaStats(empEntries), [empEntries]);
  const days = useMemo(() => buildMonthDays(monthKey), [monthKey]);

  const entryByDate = useMemo(() => {
    const map = new Map<string, DipendenteTimesheetEntryRow>();
    for (const e of empEntries) map.set(e.work_date, e);
    return map;
  }, [empEntries]);

  if (!hasAddetti) {
    return <DipendentiEmptyState variant="no-addetti" />;
  }

  if (employees.length === 0) {
    return <DipendentiEmptyState variant="no-employees" readOnly />;
  }

  if (!employee) {
    return <DipendentiEmptyState variant="select-employee" />;
  }

  const maxBar = Math.max(1, schedaStats.giorniLavorati, schedaStats.giorniAssenza);

  return (
    <div className="space-y-6">
      <div className="flex min-w-0 items-center justify-between gap-2 flex-nowrap sm:flex-wrap">
        <div>
          <p className="text-sm font-semibold text-[color:var(--cab-text)]">{employee.display_name}</p>
          <p className="text-xs text-[color:var(--cab-text-muted)]">{formatMonthLabel(monthKey)}</p>
        </div>
        <button type="button" className={dsPageToolbarBtn} onClick={() => onOpenDetail(employee)}>
          Apri dettaglio
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatChip label="Ordinarie" value={String(totals.oreOrdinarie)} />
        <StatChip label="Straordinarie" value={String(totals.oreStraordinarie)} />
        <StatChip label="Assenze (h)" value={String(totals.oreAssenza)} unit="" />
        <StatChip label="Lavorato" value={String(totals.totaleLavorato)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
            Giorni lavorati vs assenza
          </p>
          <div className="space-y-2">
            <BarRow label="Giorni lavorati" value={schedaStats.giorniLavorati} max={maxBar} color="var(--cab-success)" />
            <BarRow label="Giorni assenza" value={schedaStats.giorniAssenza} max={maxBar} color="var(--cab-danger)" />
          </div>
          <p className="text-xs text-[color:var(--cab-text-muted)]">
            Media ore/giorno lavorato:{" "}
            <strong className="text-[color:var(--cab-text)]">{schedaStats.mediaOreGiorno} h</strong>
          </p>
        </div>

        <div className="rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
            Assenze per motivo
          </p>
          {schedaStats.motiviAssenza.length === 0 ? (
            <p className="text-sm text-[color:var(--cab-text-muted)]">Nessuna assenza nel mese.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {schedaStats.motiviAssenza.map((m) => (
                <li key={m.label} className="flex min-w-0 justify-between gap-2">
                  <span className="text-[color:var(--cab-text)]">{m.label}</span>
                  <span className="tabular-nums text-[color:var(--cab-text-muted)]">
                    {m.oreAssenza} h · {m.giorni} gg
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className={gestionaleListTableClass}>
          <GlobalTableHead>
              <GlobalTableHeadLabel label="Giorno" />
              <GlobalTableHeadLabel label="Riepilogo" align="center" />
              <GlobalTableHeadLabel label="Ord." align="center" />
              <GlobalTableHeadLabel label="Str." align="center" />
              <GlobalTableHeadLabel label="Ass." align="center" />
          </GlobalTableHead>
          <tbody>
            {days.map((d) => {
              const entry = entryByDate.get(d.dateYmd);
              const cell = entryToCellValue(entry);
              const badge = formatCellShortLabel(cell, tipiAssenza);
              if (!entry && !badge) return null;
              return (
                <tr key={d.dateYmd} className="border-b border-[color:var(--cab-border)]">
                  <td className={gestionaleListTableTd}>
                    {String(d.day).padStart(2, "0")}{" "}
                    <span className="text-[color:var(--cab-text-muted)]">{d.weekdayShort}</span>
                  </td>
                  <td className={`${gestionaleListTableTd} text-center font-semibold tabular-nums`}>{badge || "—"}</td>
                  <td className={`${gestionaleListTableTd} text-center tabular-nums`}>{cell.oreOrdinarie || "—"}</td>
                  <td className={`${gestionaleListTableTd} text-center tabular-nums`}>{cell.oreStraordinarie || "—"}</td>
                  <td className={`${gestionaleListTableTd} text-center tabular-nums`}>{cell.oreAssenza || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-[color:var(--cab-border)] pt-4">
        <p className="mb-3 text-sm font-semibold text-[color:var(--cab-text)]">Andamento annuale</p>
        <DipendentiStoricoSection
          monthKey={monthKey}
          employees={employees}
          filterEmployeeId={filterEmployeeId}
          hasAddetti={hasAddetti}
          onOpenDetail={onOpenDetail}
        />
      </div>
    </div>
  );
}

function StatChip({ label, value, unit = "h" }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-2 text-center">
      <p className="text-[10px] uppercase text-[color:var(--cab-text-muted)]">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-[color:var(--cab-text)]">
        {value}
        {unit ? <span className="ml-0.5 text-xs font-normal text-[color:var(--cab-text-muted)]">{unit}</span> : null}
      </p>
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-0.5 flex min-w-0 justify-between text-xs">
        <span className="text-[color:var(--cab-text-muted)]">{label}</span>
        <span className="font-semibold tabular-nums text-[color:var(--cab-text)]">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[color:color-mix(in_srgb,var(--cab-text-muted)_12%,transparent)]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
