"use client";

import type { ReactNode } from "react";
import type { ControlTowerKpiMetric } from "@/lib/dashboard/control-tower-selectors";
import type { DashboardWidgetDefinition } from "@/lib/dashboard/dashboard-widget-registry";
import { LoadingCardSkeleton } from "@/components/design-system";
import { wrapDashboardWidget } from "@/components/dashboard/dashboard-widget-shell";
import {
  reportArrowAndTone,
  reportCompareBadgeClass,
  reportMetricCardCompactClass,
} from "@/components/report/report-ui-tokens";
import { useControlTowerContext } from "@/components/dashboard/control-tower-metrics-provider";

function fmtPct(p: number | null): string | null {
  if (p == null) return null;
  const s = p > 0 ? "+" : "";
  return `${s}${p.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
}

function formatMetricValue(value: number | null | undefined, unit?: ControlTowerKpiMetric["unit"]): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const n =
    unit === "hours"
      ? value.toLocaleString("it-IT", { maximumFractionDigits: 1 })
      : value.toLocaleString("it-IT", { maximumFractionDigits: 0 });
  return unit === "hours" ? `${n} h` : n;
}

function formatDeltaAbs(metric: ControlTowerKpiMetric): string | null {
  if (metric.deltaAbs == null) return null;
  return metric.unit === "hours" ? `${metric.deltaAbs} h` : metric.deltaAbs;
}

function KpiCompareBadge({
  metric,
  prevLabel,
}: {
  metric: ControlTowerKpiMetric;
  prevLabel: string;
}) {
  const pctStr = fmtPct(metric.deltaPct);
  const { arrow, tone } = reportArrowAndTone(metric.deltaPct, metric.invert);
  const absStr = formatDeltaAbs(metric);
  if (absStr == null && pctStr == null) return null;

  return (
    <span
      className={reportCompareBadgeClass(tone)}
      title={`Variazione rispetto alla settimana precedente (${prevLabel})`}
    >
      <span className="text-xs leading-none" aria-hidden>
        {arrow}
      </span>
      {absStr != null ? <span>{absStr}</span> : null}
      {pctStr != null ? (
        <span className={absStr != null ? "font-normal opacity-90" : undefined}>{pctStr}</span>
      ) : null}
    </span>
  );
}

function KpiMetricRow({ metric }: { metric: ControlTowerKpiMetric }) {
  const valueStr = formatMetricValue(metric.value, metric.unit);
  const showCompare = !metric.snapshot && metric.prevValue != null;
  const prevLabel = showCompare ? formatMetricValue(metric.prevValue, metric.unit) : null;

  return (
    <li className="min-w-0 border-b border-[color:color-mix(in_srgb,var(--cab-border)_65%,transparent)] py-2.5 first:pt-0 last:border-b-0 last:pb-0">
      <p className="text-sm font-medium leading-snug text-[color:var(--cab-text)]">{metric.label}</p>
      <div className="mt-1 flex min-w-0 items-end justify-between gap-3">
        <span className="text-2xl font-semibold leading-none tabular-nums tracking-tight text-[color:var(--cab-text)]">
          {valueStr}
        </span>
        {showCompare && prevLabel != null ? (
          <KpiCompareBadge metric={metric} prevLabel={prevLabel} />
        ) : null}
      </div>
      {showCompare && prevLabel != null ? (
        <p className="mt-1.5 text-xs leading-snug text-[color:var(--cab-text-muted)]">
          Settimana precedente:{" "}
          <span className="font-semibold tabular-nums text-[color:var(--cab-text)]">{prevLabel}</span>
        </p>
      ) : metric.snapshot ? (
        <p className="mt-1.5 text-xs leading-snug text-[color:var(--cab-text-muted)]">
          {metric.hint ?? "Valore aggiornato ad oggi, senza confronto settimanale"}
        </p>
      ) : null}
    </li>
  );
}

export function DashboardOperationalKpiHeaderWidget({ def }: { def: DashboardWidgetDefinition }) {
  const { slices, isLoading } = useControlTowerContext();
  const header = slices?.headerKpi;

  if (isLoading && !header) {
    return wrapDashboardWidget(def, <LoadingCardSkeleton minHeightClass="min-h-[8rem]" rows={2} />);
  }
  if (!header || header.clusters.length === 0) return null;

  const body: ReactNode = (
    <div className="grid min-w-0 gap-3 lg:grid-cols-2 xl:grid-cols-4">
      {header.clusters.map((cluster) => (
        <article key={cluster.id} className={`${reportMetricCardCompactClass} flex h-full min-w-0 flex-col`}>
          <h3 className="border-b border-[color:var(--cab-border)] pb-2 text-sm font-semibold text-[color:var(--cab-text)]">
            {cluster.label}
          </h3>
          <ul className="mt-1 min-w-0 flex-1">
            {cluster.metrics.map((m) => (
              <KpiMetricRow key={m.id} metric={m} />
            ))}
          </ul>
        </article>
      ))}
    </div>
  );

  return wrapDashboardWidget(def, body);
}
