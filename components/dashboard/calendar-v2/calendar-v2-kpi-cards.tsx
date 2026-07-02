"use client";

import { dsTypoCaption, dsTypoSmall } from "@/lib/ui/design-system";
import type { CalendarDaySummary } from "@/lib/report/calendar-report-service";
import { operationalStatusLabel } from "@/lib/report/calendar-report-service";

function KpiTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-3 py-2.5">
      <p className={`${dsTypoCaption} font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]`}>
        {label}
      </p>
      <p className="mt-1 text-xl font-bold tabular-nums text-[color:var(--cab-text)]">{value}</p>
      {sub ? <p className={`mt-0.5 ${dsTypoCaption} text-[color:var(--cab-text-muted)]`}>{sub}</p> : null}
    </div>
  );
}

export function CalendarV2KpiCards({ summary }: { summary: CalendarDaySummary }) {
  const { kpis } = summary;
  return (
    <div className="min-w-0 space-y-2">
      <div className="grid min-w-0 grid-cols-3 gap-2">
        <KpiTile label="Ingressi" value={String(summary.entriesCount)} />
        <KpiTile label="Uscite" value={String(summary.exitsCount)} />
        <KpiTile
          label="Mezzi attivi"
          value={kpis.vehiclesActive != null ? String(kpis.vehiclesActive) : "—"}
          sub="Proxy officina"
        />
      </div>
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${dsTypoSmall} text-[color:var(--cab-text-muted)]`}>
        {kpis.averageDwellTime != null ? (
          <span>Permanenza media: {kpis.averageDwellTime} gg</span>
        ) : null}
        {kpis.anomaliesCount != null ? <span>Anomalie: {kpis.anomaliesCount}</span> : null}
        <span className="font-medium text-[color:var(--cab-text)]">
          {operationalStatusLabel(summary.operationalStatus)}
        </span>
      </div>
    </div>
  );
}

export function CalendarV2WeekKpiCards({
  entriesCount,
  exitsCount,
  entriesTrendPct,
  exitsTrendPct,
  anomaliesCount,
}: {
  entriesCount: number;
  exitsCount: number;
  entriesTrendPct: number | null;
  exitsTrendPct: number | null;
  anomaliesCount: number;
}) {
  const fmtTrend = (pct: number | null) => {
    if (pct == null) return undefined;
    const dir = pct >= 0 ? "↑" : "↓";
    return `${dir} ${Math.abs(pct)}% vs sett. prec.`;
  };

  return (
    <div className="min-w-0 space-y-2">
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3">
        <KpiTile label="Ingressi sett." value={String(entriesCount)} sub={fmtTrend(entriesTrendPct)} />
        <KpiTile label="Uscite sett." value={String(exitsCount)} sub={fmtTrend(exitsTrendPct)} />
        <KpiTile label="Anomalie" value={String(anomaliesCount)} />
      </div>
    </div>
  );
}
