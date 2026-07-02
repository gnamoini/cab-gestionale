"use client";

import type { KpiCompareRow } from "@/lib/report/build-report-model";
import { CONTROL_TOWER_KPI_WINDOW_LABEL } from "@/lib/dashboard/control-tower-constants";
import { LoadingCardSkeleton } from "@/components/design-system";
import {
  dsDashboardWidgetTitle,
  dsSurfaceCard,
  dsTypoCaption,
} from "@/lib/ui/design-system";
import {
  reportCompareToneClass,
  type ReportCompareTone,
} from "@/components/report/report-ui-tokens";
import { useControlTowerContext } from "@/components/dashboard/control-tower-metrics-provider";

function fmtPct(p: number | null): string | null {
  if (p == null) return null;
  const s = p > 0 ? "+" : "";
  return `${s}${p.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
}

function arrowAndTone(deltaPct: number | null, invert?: boolean): { arrow: string; tone: ReportCompareTone } {
  if (deltaPct == null || !Number.isFinite(deltaPct)) return { arrow: "→", tone: "flat" };
  if (deltaPct === 0) return { arrow: "→", tone: "flat" };
  if (invert) {
    if (deltaPct < 0) return { arrow: "↑", tone: "up" };
    return { arrow: "↓", tone: "down" };
  }
  if (deltaPct > 0) return { arrow: "↑", tone: "up" };
  return { arrow: "↓", tone: "down" };
}

function DeltaBadge({ metric }: { metric: { deltaPct: number | null; deltaAbs: string | null; invert?: boolean } }) {
  if (metric.deltaPct == null && metric.deltaAbs == null) return null;
  const pctStr = fmtPct(metric.deltaPct);
  const { arrow, tone } = arrowAndTone(metric.deltaPct, metric.invert);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_60%,var(--cab-card))] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${reportCompareToneClass(tone)}`}
      title="vs settimana precedente (stesso periodo)"
    >
      <span>{arrow}</span>
      {metric.deltaAbs != null ? <span>{metric.deltaAbs}</span> : null}
      {pctStr != null ? <span className="font-normal opacity-90">{pctStr}</span> : null}
    </span>
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
            <ul className="mt-2 space-y-2">
              {cluster.metrics.map((m) => (
                <li key={m.id} className="flex min-w-0 items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm text-[color:var(--cab-text-muted)]">{m.label}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-base font-semibold tabular-nums text-[color:var(--cab-text)]">{m.value}</span>
                    <DeltaBadge metric={m as KpiCompareRow} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
