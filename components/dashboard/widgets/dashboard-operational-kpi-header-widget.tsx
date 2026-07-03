"use client";

import type { ControlTowerKpiMetric } from "@/lib/dashboard/control-tower-selectors";
import { CONTROL_TOWER_KPI_WINDOW_LABEL } from "@/lib/dashboard/control-tower-constants";
import { LoadingCardSkeleton } from "@/components/design-system";
import {
  dsDashboardWidgetTitle,
  dsSurfaceCard,
  dsTypoCaption,
} from "@/lib/ui/design-system";
import {
  reportArrowAndTone,
  reportCompareBadgeClass,
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

function KpiMetricRow({ metric }: { metric: ControlTowerKpiMetric }) {
  const pctStr = fmtPct(metric.deltaPct);
  const { arrow, tone } = reportArrowAndTone(metric.deltaPct, metric.invert);
  const absStr = formatDeltaAbs(metric);
  const showCompare = !metric.snapshot && metric.prevValue != null;
  const prevLabel = showCompare ? formatMetricValue(metric.prevValue, metric.unit) : null;

  return (
    <li className="min-w-0">
      <p className="truncate text-sm text-[color:var(--cab-text-muted)]">{metric.label}</p>
      <div className="mt-0.5 flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <span className="text-xl font-semibold tabular-nums text-[color:var(--cab-text)]">
          {formatMetricValue(metric.value, metric.unit)}
        </span>
        {showCompare ? (
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            {absStr != null || pctStr != null ? (
              <span
                className={reportCompareBadgeClass(tone)}
                title={`Settimana precedente: ${prevLabel} — vs stesso periodo`}
              >
                <span className="text-xs leading-none" aria-hidden>
                  {arrow}
                </span>
                {absStr != null ? <span>{absStr}</span> : null}
                {pctStr != null ? (
                  <span className={absStr != null ? "font-normal opacity-90" : undefined}>{pctStr}</span>
                ) : null}
              </span>
            ) : null}
            <span className="text-[10px] tabular-nums text-[color:var(--cab-text-muted)]">
              {prevLabel != null ? `prec. ${prevLabel}` : null}
            </span>
          </div>
        ) : null}
      </div>
    </li>
  );
}

export function DashboardOperationalKpiHeaderWidget() {
  const { slices, isLoading } = useControlTowerContext();
  const header = slices?.headerKpi;

  if (isLoading && !header) {
    return <LoadingCardSkeleton minHeightClass="min-h-[8rem]" rows={2} />;
  }
  if (!header || header.clusters.length === 0) return null;

  return (
    <section className={`${dsSurfaceCard} p-4 sm:p-5`} aria-label={CONTROL_TOWER_KPI_WINDOW_LABEL}>
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
        <h2 className={dsDashboardWidgetTitle}>Control Tower</h2>
        <p className={dsTypoCaption}>{CONTROL_TOWER_KPI_WINDOW_LABEL}</p>
      </div>
      <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {header.clusters.map((cluster) => (
          <div key={cluster.id} className="min-w-0 rounded-lg border border-[color:var(--cab-border)] p-3">
            <p className={`${dsTypoCaption} font-semibold uppercase tracking-wide`}>{cluster.label}</p>
            <ul className="mt-3 space-y-3">
              {cluster.metrics.map((m) => (
                <KpiMetricRow key={m.id} metric={m} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
