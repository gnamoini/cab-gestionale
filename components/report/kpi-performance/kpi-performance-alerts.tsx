"use client";

import type { KpiPerformanceAlert } from "@/lib/report/kpi-performance/kpi-performance-types";

export const kpiPerformanceAlertToneClass: Record<KpiPerformanceAlert["severity"], string> = {
  info: "border-[color:var(--cab-border)] bg-[var(--cab-card)]",
  warning:
    "border-[color:color-mix(in_srgb,var(--cab-warning)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_8%,var(--cab-card))]",
  critical:
    "border-[color:color-mix(in_srgb,var(--cab-danger)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_8%,var(--cab-card))]",
};

export function KpiPerformanceAlertCard({ alert }: { alert: KpiPerformanceAlert }) {
  return (
    <div className={`rounded-[var(--ds-radius-lg)] border px-3 py-2.5 ${kpiPerformanceAlertToneClass[alert.severity]}`}>
      <p className="text-sm leading-relaxed text-[color:var(--cab-text)]">{alert.detail}</p>
    </div>
  );
}

export function KpiPerformanceAlerts({ alerts }: { alerts: KpiPerformanceAlert[] }) {
  if (alerts.length === 0) {
    return <p className="text-sm text-[color:var(--cab-text-muted)]">Nessuna criticità rilevata sui dati attuali.</p>;
  }

  return (
    <ul className="min-w-0 space-y-2">
      {alerts.map((a) => (
        <li key={a.id}>
          <KpiPerformanceAlertCard alert={a} />
        </li>
      ))}
    </ul>
  );
}
