"use client";

import { Tooltip } from "@/components/ui";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { useAuthUserId } from "@/context/auth-context";
import type { ControlTowerKpiCluster, ControlTowerKpiMetric } from "@/lib/dashboard/control-tower-selectors";
import {
  buildControlTowerHeaderKpiSlice,
  filterControlTowerKpiClusters,
  type ControlTowerBriefMode,
} from "@/lib/dashboard/control-tower-selectors";
import type { DashboardWidgetDefinition } from "@/lib/dashboard/dashboard-widget-registry";
import { LoadingCardSkeleton } from "@/components/design-system";
import { wrapDashboardWidget } from "@/components/dashboard/dashboard-widget-shell";
import {
  reportArrowAndTone,
  reportCompareBadgeClass,
  reportMetricCardCompactClass,
} from "@/components/report/report-ui-tokens";
import { useControlTowerContext } from "@/components/dashboard/control-tower-metrics-provider";
import { dsFocus, dsSegmentedBtnOff, dsSegmentedBtnOn, dsSegmentedWrap } from "@/lib/ui/design-system";
import { useCollapsiblePreference } from "@/lib/ui/collapsible-prefs";

const BRIEF_MODE_PREF_KEY = "operational-kpi-header-brief-mode";

function useBriefPeriodPreference(): [ControlTowerBriefMode, (mode: ControlTowerBriefMode) => void] {
  const userId = useAuthUserId();
  const [period, setPeriod] = useCollapsiblePreference<ControlTowerBriefMode>({
    userId,
    scope: "dashboard",
    key: BRIEF_MODE_PREF_KEY,
    defaultValue: "week",
    serialize: (value) => value,
    deserialize: (raw, fallback) =>
      raw === "day" || raw === "week" || raw === "month" ? raw : fallback,
  });
  return [period, setPeriod];
}

function fmtPct(p: number | null): string | null {
  if (p == null) return null;
  const s = p > 0 ? "+" : "";
  return `${s}${p.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
}

function formatMetricValue(value: number | null | undefined, unit?: ControlTowerKpiMetric["unit"]): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (unit === "currency") {
    return value.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  }
  const n =
    unit === "hours" || unit === "days"
      ? value.toLocaleString("it-IT", { maximumFractionDigits: 1 })
      : value.toLocaleString("it-IT", { maximumFractionDigits: 0 });
  if (unit === "hours") return `${n} h`;
  if (unit === "days") return `${n} gg`;
  return n;
}

function formatDeltaAbs(metric: ControlTowerKpiMetric): string | null {
  if (metric.deltaAbs == null) return null;
  if (metric.unit === "hours") return `${metric.deltaAbs} h`;
  if (metric.unit === "days" || metric.unit === "currency") return String(metric.deltaAbs);
  return String(metric.deltaAbs);
}

/** Max 3 KPI per card nel brief — ordine = priorità. Health score usa tutte le metriche. */
const BRIEF_DISPLAY_METRIC_IDS: Record<ControlTowerKpiCluster["id"], readonly string[]> = {
  lavorazioni: ["lav-completate", "lav-aperte", "lav-tempo-chiusura"],
  dipendenti: ["dip-ore", "dip-assenze", "dip-straord"],
  ricambi: ["mag-consumi", "mag-entrate", "mag-sotto-scorta"],
  amministrazione: ["fatt-fatturato", "fatt-incassato", "prev-emessi"],
};

function briefMetricsForCluster(cluster: ControlTowerKpiCluster): ControlTowerKpiMetric[] {
  const order = BRIEF_DISPLAY_METRIC_IDS[cluster.id];
  if (!order) return cluster.metrics.slice(0, 3);
  const byId = new Map(cluster.metrics.map((m) => [m.id, m]));
  return order.map((id) => byId.get(id)).filter((m): m is ControlTowerKpiMetric => m != null);
}

function briefPeriodChipClass(active: boolean): string {
  return `flex min-h-10 min-w-0 flex-1 items-center justify-center rounded-[var(--ds-radius-lg)] px-2 text-xs font-semibold !py-0 sm:min-h-9 sm:px-3 sm:text-sm ${
    active ? dsSegmentedBtnOn : dsSegmentedBtnOff
  } ${dsFocus}`;
}

function BriefPeriodToggle({
  period,
  onChange,
}: {
  period: ControlTowerBriefMode;
  onChange: (period: ControlTowerBriefMode) => void;
}) {
  return (
    <div
      className={`${dsSegmentedWrap} w-full min-w-0 gap-0.5 p-0.5`}
      role="group"
      aria-label="Periodo brief operativo"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {(
        [
          ["day", "Giorno"],
          ["week", "Settimana"],
          ["month", "Mese"],
        ] as const
      ).map(([id, label]) => {
        const active = period === id;
        return (
          <button
            key={id}
            type="button"
            className={briefPeriodChipClass(active)}
            aria-pressed={active}
            onClick={() => onChange(id)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function KpiCompareBadge({
  metric,
  prevLabel,
  comparePeriod,
}: {
  metric: ControlTowerKpiMetric;
  prevLabel: string;
  comparePeriod: "week" | "month";
}) {
  const pctStr = fmtPct(metric.deltaPct);
  const { arrow, tone } = reportArrowAndTone(metric.deltaPct, metric.invert);
  const absStr = formatDeltaAbs(metric);
  if (absStr == null && pctStr == null) return null;

  const periodLabel = comparePeriod === "month" ? "mese precedente" : "settimana precedente";

  return (
    <Tooltip content={`Variazione rispetto al ${periodLabel} (${prevLabel})`}><span className={reportCompareBadgeClass(tone)}>
      <span className="text-xs leading-none" aria-hidden>
        {arrow}
      </span>
      {absStr != null ? <span>{absStr}</span> : null}
      {pctStr != null ? (<span className={absStr != null ? "font-normal opacity-90" : undefined}>{pctStr}</span>) : null}
    </span></Tooltip>
  );
}

function KpiMetricRow({
  metric,
  showComparisons,
  comparePeriod,
}: {
  metric: ControlTowerKpiMetric;
  showComparisons: boolean;
  comparePeriod: "week" | "month";
}) {
  const valueStr = formatMetricValue(metric.value, metric.unit);
  const showCompare = showComparisons && !metric.snapshot && metric.prevValue != null;
  const prevLabel = showCompare ? formatMetricValue(metric.prevValue, metric.unit) : null;
  const prevPeriodLabel = comparePeriod === "month" ? "Mese precedente" : "Settimana precedente";

  return (
    <li className="min-w-0 border-b border-[color:color-mix(in_srgb,var(--cab-border)_65%,transparent)] py-2.5 first:pt-0 last:border-b-0 last:pb-0">
      <p className="text-sm font-medium leading-snug text-[color:var(--cab-text)]">{metric.label}</p>
      <div className="mt-1 flex min-w-0 items-end justify-between gap-3">
        <span className="text-2xl font-semibold leading-none tabular-nums tracking-tight text-[color:var(--cab-text)]">
          {valueStr}
        </span>
        {showCompare && prevLabel != null ? (
          <KpiCompareBadge metric={metric} prevLabel={prevLabel} comparePeriod={comparePeriod} />
        ) : null}
      </div>
      {showCompare && prevLabel != null ? (
        <p className="mt-1.5 text-xs leading-snug text-[color:var(--cab-text-muted)]">
          {prevPeriodLabel}:{" "}
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
  const { headerKpiBase, isLoading } = useControlTowerContext();
  const [period, setPeriod] = useBriefPeriodPreference();

  const header = useMemo(() => {
    if (!headerKpiBase) return null;
    const slice = buildControlTowerHeaderKpiSlice({
      ...headerKpiBase.input,
      briefMode: period,
    });
    return filterControlTowerKpiClusters(slice, headerKpiBase.filter);
  }, [headerKpiBase, period]);

  if (isLoading && !header) {
    return wrapDashboardWidget(def, <LoadingCardSkeleton minHeightClass="min-h-[8rem]" rows={2} />);
  }
  if (!header || header.clusters.length === 0) return null;

  const showComparisons = period === "week" || period === "month";
  const comparePeriod = period === "month" ? "month" : "week";

  const body: ReactNode = (
    <div className="grid min-w-0 gap-3 lg:grid-cols-2 xl:grid-cols-4">
      <div className="min-w-0 max-xl:col-span-full xl:col-span-1 xl:row-start-1">
        <BriefPeriodToggle period={period} onChange={setPeriod} />
      </div>
      {header.clusters.map((cluster) => (
        <article
          key={cluster.id}
          className={`${reportMetricCardCompactClass} flex h-full min-w-0 flex-col xl:row-start-2`}
        >
          <h3 className="border-b border-[color:var(--cab-border)] pb-2 text-sm font-semibold text-[color:var(--cab-text)]">
            {cluster.label}
          </h3>
          <ul className="mt-1 min-w-0 flex-1">
            {briefMetricsForCluster(cluster).map((m) => (
              <KpiMetricRow key={m.id} metric={m} showComparisons={showComparisons} comparePeriod={comparePeriod} />
            ))}
          </ul>
        </article>
      ))}
    </div>
  );

  return wrapDashboardWidget(def, body);
}
