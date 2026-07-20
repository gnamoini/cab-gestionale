"use client";

import type { KpiPerformanceAlert } from "@/lib/report/kpi-performance/kpi-performance-types";
import { kpiPerformanceAlertToneClass } from "@/components/report/kpi-performance/kpi-performance-alerts";

const FLEET_ALERT_IDS = new Set([
  "guasti-alta",
  "recidiva",
  "clienti-sotto-soglia",
  "fleet-disponibilita-bassa",
  "top-cliente-concentrazione",
  "compliance-scaduta",
  "compliance-imminente",
]);

export function filterFleetAlerts(alerts: readonly KpiPerformanceAlert[]): KpiPerformanceAlert[] {
  return alerts.filter((a) => FLEET_ALERT_IDS.has(a.id));
}

function scrollToAnchor(id: string) {
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function alertCta(alert: KpiPerformanceAlert): { label: string; targetId: string } | null {
  switch (alert.id) {
    case "guasti-alta":
      return { label: "Vedi mezzi critici", targetId: "report-cm-mezzi-critici" };
    case "recidiva":
      return { label: "Vedi mezzi critici", targetId: "report-cm-mezzi-critici" };
    case "clienti-sotto-soglia":
    case "fleet-disponibilita-bassa":
      return { label: "Apri disponibilità", targetId: "report-cm-disponibilita-table" };
    case "top-cliente-concentrazione":
      return { label: "Vedi classifiche", targetId: "report-cm-classifiche" };
    case "compliance-scaduta":
    case "compliance-imminente":
      return { label: "Apri compliance", targetId: "report-cm-compliance" };
    default:
      return null;
  }
}

export function ReportFleetAlerts({ alerts }: { alerts: readonly KpiPerformanceAlert[] }) {
  const fleetAlerts = filterFleetAlerts(alerts);
  if (fleetAlerts.length === 0) return null;

  return (
    <div
      className="space-y-2 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_35%,var(--cab-card))] p-3"
      role="region"
      aria-label="Criticità flotta"
    >
      <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
        Criticità flotta
      </p>
      <ul className="min-w-0 space-y-2">
        {fleetAlerts.map((alert) => {
          const cta = alertCta(alert);
          return (
            <li
              key={alert.id}
              className={`rounded-[var(--ds-radius-lg)] border px-3 py-2.5 ${kpiPerformanceAlertToneClass[alert.severity]}`}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[color:var(--cab-text)]">{alert.title}</p>
                  <p className="mt-0.5 text-xs text-[color:var(--cab-text-muted)]">{alert.detail}</p>
                </div>
                {cta ? (
                  <button
                    type="button"
                    className="shrink-0 text-xs font-medium text-[color:var(--cab-primary)] underline underline-offset-2"
                    onClick={() => scrollToAnchor(cta.targetId)}
                  >
                    {cta.label}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
