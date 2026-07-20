"use client";

import type { KpiPerformanceAlert } from "@/lib/report/kpi-performance/kpi-performance-types";
import { KPI_OPEN_LATE_DAYS_THRESHOLD } from "@/lib/report/kpi-performance/kpi-performance-constants";
import { kpiPerformanceAlertToneClass } from "@/components/report/kpi-performance/kpi-performance-alerts";

const LAVORAZIONI_ALERT_IDS = new Set(["open-late"]);

export function filterLavorazioniAlerts(alerts: readonly KpiPerformanceAlert[]): KpiPerformanceAlert[] {
  return alerts.filter((a) => LAVORAZIONI_ALERT_IDS.has(a.id));
}

export function filterMagazzinoAlerts(alerts: readonly KpiPerformanceAlert[]): KpiPerformanceAlert[] {
  return alerts.filter((a) => a.id === "sotto-scorta");
}

function scrollToAnchor(id: string) {
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function ReportLavorazioniBacklogAlerts({
  alerts,
}: {
  alerts: readonly KpiPerformanceAlert[];
}) {
  const lavAlerts = filterLavorazioniAlerts(alerts);
  if (lavAlerts.length === 0) return null;

  return (
    <div
      className="mb-4 space-y-2 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_35%,var(--cab-card))] p-3"
      role="region"
      aria-label="Criticità backlog"
    >
      <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
        Criticità operative
      </p>
      <ul className="min-w-0 space-y-2">
        {lavAlerts.map((alert) => (
          <li
            key={alert.id}
            className={`rounded-[var(--ds-radius-lg)] border px-3 py-2.5 ${kpiPerformanceAlertToneClass[alert.severity]}`}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[color:var(--cab-text)]">{alert.title}</p>
                <p className="mt-0.5 text-xs text-[color:var(--cab-text-muted)]">{alert.detail}</p>
                {alert.id === "open-late" ? (
                  <p className="mt-1 text-[10px] text-[color:var(--cab-text-muted)]">
                    Soglia SLA: {KPI_OPEN_LATE_DAYS_THRESHOLD} giorni
                  </p>
                ) : null}
              </div>
              {alert.id === "open-late" ? (
                <button
                  type="button"
                  className="shrink-0 text-xs font-medium text-[color:var(--cab-primary)] underline underline-offset-2"
                  onClick={() => scrollToAnchor("report-lav-sla-table")}
                >
                  Apri tabella SLA
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
