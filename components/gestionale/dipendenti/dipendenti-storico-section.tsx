"use client";

import { useMemo } from "react";
import { DipendentiEmptyState, DipendentiQueryErrorBanner } from "@/components/gestionale/dipendenti/dipendenti-empty-state";
import { formatMonthLabel } from "@/lib/dipendenti/timesheet-month";
import type { DipendenteTimesheetEmployeeRow, TimesheetMonthKey } from "@/lib/dipendenti/types";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import { gestionaleListTableClass, gestionaleListTableTd } from "@/lib/ui/gestionale-list-table";
import { useDipendenteAnnualHistory } from "@/src/hooks/use-dipendente-annual-history";

export function DipendentiStoricoSection({
  monthKey,
  employees,
  filterEmployeeId,
  hasAddetti,
  onOpenDetail,
}: {
  monthKey: TimesheetMonthKey;
  employees: readonly DipendenteTimesheetEmployeeRow[];
  filterEmployeeId: string;
  hasAddetti: boolean;
  onOpenDetail: (employee: DipendenteTimesheetEmployeeRow) => void;
}) {
  const employee = useMemo(
    () => (filterEmployeeId ? employees.find((e) => e.id === filterEmployeeId) ?? null : null),
    [employees, filterEmployeeId],
  );

  const { year, months, yearTotals, isLoading, isError, errorMessage, refetch } = useDipendenteAnnualHistory(
    employee?.id ?? null,
    monthKey,
  );

  const maxLavorato = useMemo(() => Math.max(1, ...months.map((m) => m.totaleLavorato)), [months]);

  if (!hasAddetti) {
    return <DipendentiEmptyState variant="no-addetti" />;
  }

  if (employees.length === 0) {
    return <DipendentiEmptyState variant="no-employees" readOnly />;
  }

  if (!employee) {
    return <DipendentiEmptyState variant="select-employee" />;
  }

  if (isError) {
    return (
      <DipendentiQueryErrorBanner
        title="Impossibile caricare lo storico annuale"
        message={errorMessage ?? "Errore durante il caricamento dei dati."}
        onRetry={() => refetch()}
      />
    );
  }

  if (isLoading) {
    return <p className="text-sm text-[color:var(--cab-text-muted)]">Caricamento storico {year}…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[color:var(--cab-text)]">
          <strong>{employee.display_name}</strong> — riepilogo anno {year}
        </p>
        <button
          type="button"
          className="text-xs font-medium text-[color:var(--cab-primary)] hover:underline"
          onClick={() => onOpenDetail(employee)}
        >
          Dettaglio mese corrente
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatChip label="Ordinarie" value={`${yearTotals.oreOrdinarie} h`} />
        <StatChip label="Straordinarie" value={`${yearTotals.oreStraordinarie} h`} />
        <StatChip label="Assenze" value={`${yearTotals.oreAssenza} h`} />
        <StatChip label="Giorni assenza" value={String(yearTotals.giorniAssenza)} unit="" />
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
          Andamento ore lavorate ({year})
        </p>
        <div className="flex min-w-0 h-24 items-end gap-1 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-2 py-2">
          {months.map((m) => {
            const h = m.totaleLavorato > 0 ? Math.max(8, (m.totaleLavorato / maxLavorato) * 100) : 4;
            return (
              <div key={m.monthKey} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${m.monthLabel}: ${m.totaleLavorato} h`}>
                <div
                  className="w-full rounded-t bg-[color:var(--cab-primary)] opacity-80"
                  style={{ height: `${h}%` }}
                />
                <span className="text-[9px] tabular-nums text-[color:var(--cab-text-muted)]">
                  {String(m.month).padStart(2, "0")}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className={gestionaleListTableClass}>
          <GlobalTableHead>
              <GlobalTableHeadLabel label="Mese" />
              <GlobalTableHeadLabel label="Ord." align="center" />
              <GlobalTableHeadLabel label="Str." align="center" />
              <GlobalTableHeadLabel label="Ass." align="center" />
              <GlobalTableHeadLabel label="Lavorato" align="center" />
          </GlobalTableHead>
          <tbody>
            {months.map((m) => (
              <tr key={m.monthKey} className="border-b border-[color:var(--cab-border)]">
                <td className={gestionaleListTableTd}>{formatMonthLabel(m.monthKey)}</td>
                <td className={`${gestionaleListTableTd} text-center tabular-nums`}>{m.oreOrdinarie || "—"}</td>
                <td className={`${gestionaleListTableTd} text-center tabular-nums`}>{m.oreStraordinarie || "—"}</td>
                <td className={`${gestionaleListTableTd} text-center tabular-nums`}>{m.oreAssenza || "—"}</td>
                <td className={`${gestionaleListTableTd} text-center font-semibold tabular-nums`}>
                  {m.totaleLavorato || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
