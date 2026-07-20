"use client";

import type { KpiPerformanceFleet } from "@/lib/report/kpi-performance/kpi-performance-types";
import { FLEET_DISP_SOGLIA_PCT, topClienteConcentrazionePct } from "@/lib/report/kpi-performance/fleet-report-helpers";
import type { TopClienteReportRow } from "@/lib/report/report-classifiche";

export function ReportFleetInsightStrip({
  fleet,
  topsClienti,
  kmAnomalies = 0,
  mezziIdle = 0,
}: {
  fleet: KpiPerformanceFleet;
  topsClienti: readonly TopClienteReportRow[];
  kmAnomalies?: number;
  mezziIdle?: number;
}) {
  const insights: string[] = [];

  if (fleet.clientiSottoSoglia > 0) {
    insights.push(
      `${fleet.clientiSottoSoglia} clienti con disponibilità sotto il ${FLEET_DISP_SOGLIA_PCT}%`,
    );
  }
  if (fleet.mezziAltaFrequenzaGuasti.length > 0) {
    insights.push(`${fleet.mezziAltaFrequenzaGuasti.length} mezzi con frequenza guasti elevata`);
  }
  if (fleet.avgDowntimeDays != null && fleet.avgDowntimeDays > 14) {
    insights.push(
      `Tempo medio fermo ${fleet.avgDowntimeDays.toLocaleString("it-IT", { maximumFractionDigits: 1 })} gg — sopra la media attesa`,
    );
  }
  const conc = topClienteConcentrazionePct(topsClienti);
  if (conc && conc.pct > 30) {
    insights.push(`${conc.cliente} concentra il ${conc.pct}% degli interventi`);
  }
  if (kmAnomalies > 0) {
    insights.push(`${kmAnomalies} anomalie chilometriche rilevate`);
  }
  if (mezziIdle > 0) {
    insights.push(`${mezziIdle} mezzi senza interventi da oltre 60 giorni`);
  }

  if (insights.length === 0) return null;

  return (
    <div
      className="rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-primary)_22%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_6%,var(--cab-card))] px-3 py-2.5"
      role="status"
    >
      <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
        Insight automatici
      </p>
      <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-sm text-[color:var(--cab-text)]">
        {insights.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
