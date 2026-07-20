"use client";

import { filterMagazzinoAlerts } from "@/components/report/layout/report-lavorazioni-backlog-alerts";
import { kpiPerformanceAlertToneClass } from "@/components/report/kpi-performance/kpi-performance-alerts";
import type { KpiPerformanceAlert } from "@/lib/report/kpi-performance/kpi-performance-types";

function scrollToAnchor(id: string) {
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function ReportMagazzinoStockAlerts({
  alerts,
  extraAlerts = [],
}: {
  alerts: readonly KpiPerformanceAlert[];
  extraAlerts?: readonly KpiPerformanceAlert[];
}) {
  const stockAlerts = [...filterMagazzinoAlerts(alerts), ...extraAlerts];
  if (stockAlerts.length === 0) return null;

  return (
    <div className="mb-4 space-y-2" role="region" aria-label="Alert magazzino">
      <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
        Criticità magazzino
      </p>
      <ul className="min-w-0 space-y-2">
        {stockAlerts.slice(0, 3).map((alert) => (
          <li
            key={alert.id}
            className={`rounded-[var(--ds-radius-lg)] border px-3 py-2.5 ${kpiPerformanceAlertToneClass[alert.severity]}`}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[color:var(--cab-text)]">{alert.title}</p>
                <p className="mt-0.5 text-xs text-[color:var(--cab-text-muted)]">{alert.detail}</p>
              </div>
              {alert.id === "sotto-scorta" || alert.id === "copertura-critica" ? (
                <button
                  type="button"
                  className="shrink-0 text-xs font-medium text-[color:var(--cab-primary)] underline underline-offset-2"
                  onClick={() => scrollToAnchor("report-mag-stock-risk")}
                >
                  Vedi elenco rischio
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
