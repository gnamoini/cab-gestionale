"use client";

import type { KpiPerformanceAlert } from "@/lib/report/kpi-performance/kpi-performance-types";

const toneClass: Record<KpiPerformanceAlert["severity"], string> = {
  info: "border-[color:var(--cab-border)] bg-[var(--cab-card)]",
  warning:
    "border-[color:color-mix(in_srgb,var(--cab-warning)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_8%,var(--cab-card))]",
  critical:
    "border-[color:color-mix(in_srgb,var(--cab-danger)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_8%,var(--cab-card))]",
};

export function KpiPerformanceAlerts({ alerts }: { alerts: KpiPerformanceAlert[] }) {
  if (alerts.length === 0) {
    return <p className="text-sm text-[color:var(--cab-text-muted)]">Nessuna criticità rilevata sui dati attuali.</p>;
  }

  return (
    <ul className="min-w-0 space-y-2">
      {alerts.map((a) => (
        <li
          key={a.id}
          className={`rounded-[var(--ds-radius-lg)] border px-3 py-2.5 ${toneClass[a.severity]}`}
        >
          <p className="text-sm font-semibold text-[color:var(--cab-text)]">{a.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--cab-text-muted)]">{a.detail}</p>
        </li>
      ))}
    </ul>
  );
}
