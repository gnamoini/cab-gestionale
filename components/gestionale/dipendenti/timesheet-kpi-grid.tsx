"use client";

import { useMemo } from "react";
import {
  GestionaleListTable,
  GestionaleListTableRow,
  GlobalTableHeadLabel,
} from "@/components/gestionale/global-table";
import {
  computePanoramaKpi,
  computePanoramaKpiWithDelta,
  computeTopDipendenti,
} from "@/lib/dipendenti/timesheet-kpi";
import type {
  DipendenteTimesheetEmployeeRow,
  DipendenteTimesheetEntryRow,
} from "@/lib/dipendenti/types";
import { gestionaleListTableTd } from "@/lib/ui/gestionale-list-table";

function KpiCard({
  label,
  value,
  unit = "h",
  sub,
}: {
  label: string;
  value: number | string;
  unit?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-3 sm:p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-[color:var(--cab-text)]">
        {value}
        {typeof value === "number" && unit ? (
          <span className="ml-0.5 text-sm font-normal text-[color:var(--cab-text-muted)]">{unit}</span>
        ) : null}
      </p>
      {sub ? <p className="mt-1 text-[10px] text-[color:var(--cab-text-muted)]">{sub}</p> : null}
    </div>
  );
}

function formatDeltaPct(value: number | null): string {
  if (value === null) return "n/d";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}% vs mese prec.`;
}

export function TimesheetKPIGrid({
  employees,
  entries,
  previousMonthEntries,
  showMonthDelta,
}: {
  employees: readonly DipendenteTimesheetEmployeeRow[];
  entries: readonly DipendenteTimesheetEntryRow[];
  previousMonthEntries: readonly DipendenteTimesheetEntryRow[];
  showMonthDelta: boolean;
}) {
  const kpi = useMemo(() => {
    if (showMonthDelta) {
      return computePanoramaKpiWithDelta(employees, entries, previousMonthEntries);
    }
    const base = computePanoramaKpi(employees, entries);
    return {
      ...base,
      prevMonth: { oreOrdinarie: 0, oreStraordinarie: 0, oreAssenza: 0, totaleLavorato: 0 },
      delta: { totaleLavoratoPct: null, assenzeDelta: 0, overtimeDelta: 0 },
    };
  }, [employees, entries, previousMonthEntries, showMonthDelta]);
  const top = useMemo(() => computeTopDipendenti(employees, entries, 5), [employees, entries]);

  return (
    <div className="flex-safe-col min-w-0 max-w-full gap-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Dipendenti attivi" value={kpi.dipendentiAttivi} unit="" />
        <KpiCard label="Ore ordinarie" value={kpi.oreOrdinarie} sub={showMonthDelta ? formatDeltaPct(null) : undefined} />
        <KpiCard
          label="Ore straordinarie"
          value={kpi.oreStraordinarie}
          sub={showMonthDelta ? `${kpi.delta.overtimeDelta >= 0 ? "+" : ""}${kpi.delta.overtimeDelta}h vs mese prec.` : undefined}
        />
        <KpiCard
          label="Ore assenza"
          value={kpi.oreAssenza}
          sub={showMonthDelta ? `${kpi.delta.assenzeDelta >= 0 ? "+" : ""}${kpi.delta.assenzeDelta}h vs mese prec.` : undefined}
        />
        <KpiCard
          label="Totale lavorato"
          value={kpi.totaleLavorato}
          sub={showMonthDelta ? formatDeltaPct(kpi.delta.totaleLavoratoPct) : undefined}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Media ore / dipendente" value={kpi.mediaOrePerDipendente} sub="solo chi ha ore nel periodo" />
        <KpiCard label="Giorni assenza totali" value={kpi.giorniAssenzaTotali} unit="" />
        <KpiCard
          label="Più ore lavorate"
          value={kpi.topOreDipendente ? kpi.topOreDipendente.totaleLavorato : "—"}
          sub={kpi.topOreDipendente?.displayName}
        />
        <KpiCard
          label="Più straordinari"
          value={kpi.topStraordinariDipendente ? kpi.topStraordinariDipendente.oreStraordinarie : "—"}
          sub={kpi.topStraordinariDipendente?.displayName}
        />
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold text-[color:var(--cab-text)]">Top dipendenti per ore lavorate</h4>
        {top.length === 0 ? (
          <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun dato nel periodo selezionato.</p>
        ) : (
          <GestionaleListTable
            headRow={
              <>
                <GlobalTableHeadLabel label="#" align="center" thClassName="w-10" />
                <GlobalTableHeadLabel label="Dipendente" />
                <GlobalTableHeadLabel label="Lavorato" align="center" />
                <GlobalTableHeadLabel label="Ord." align="center" />
                <GlobalTableHeadLabel label="Str." align="center" />
                <GlobalTableHeadLabel label="Ass." align="center" />
              </>
            }
            colSpan={6}
          >
            {top.map((row) => (
              <GestionaleListTableRow key={row.id}>
                <td className={`${gestionaleListTableTd} text-center tabular-nums`}>{row.rank}</td>
                <td className={gestionaleListTableTd}>{row.displayName}</td>
                <td className={`${gestionaleListTableTd} text-center tabular-nums`}>{row.totaleLavorato}</td>
                <td className={`${gestionaleListTableTd} text-center tabular-nums`}>{row.oreOrdinarie}</td>
                <td className={`${gestionaleListTableTd} text-center tabular-nums`}>{row.oreStraordinarie}</td>
                <td className={`${gestionaleListTableTd} text-center tabular-nums`}>{row.oreAssenza}</td>
              </GestionaleListTableRow>
            ))}
          </GestionaleListTable>
        )}
      </div>
    </div>
  );
}
