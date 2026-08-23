"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  useRegisterAnalyticsSection,
  useReportAnalyticsContext,
} from "@/components/report/analytics/report-analytics-provider";
import { listPrimaryTrendEligibleMetrics } from "@/components/report/analytics/resolve-series-eligible-metrics";
import { buildAnalyticsPeriodFromContext } from "@/components/report/analytics/report-period-to-analytics";
import { mapUiCompareToEnvelope } from "@/components/report/bi-center/drill-down/compare-mode-bridge";
import { useReportDrillDown } from "@/components/report/bi-center/use-report-drill-down";
import { ReportAnalysisSectionShell } from "@/components/report/bi-center/report-analysis-section-shell";
import { ReportTrendChart } from "@/components/report/bi-center/report-trend-chart";
import { ReportTrustCompareFooter } from "@/components/report/bi-center/advanced/report-trust-compare-footer";
import { ReportTrustBadge } from "@/components/report/bi-center/report-trust-badge";
import { ReportMetricCompareSection } from "@/components/report/report-metric-compare-section";
import { useReportPeriodContext } from "@/components/report/context/report-period-context";
import { formatCompareLabel } from "@/lib/report/date-ranges";
import type { ReportAnalyticsGranularity } from "@/lib/report/analytics-engine/types";
import { formatReportMetricValue } from "@/lib/report/metrics/format-report-metric-value";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import { getReportBusinessLabel, getReportBusinessLabelHint, getReportSectionCopy } from "@/lib/report/ui/report-business-labels";
import { isDrilldownSupported } from "@/lib/report/drilldown/drilldown-metric-registry";

const GRANULARITIES: ReportAnalyticsGranularity[] = ["day", "week", "month"];

const GRANULARITY_LABELS: Record<ReportAnalyticsGranularity, string> = {
  day: "Giorno",
  week: "Settimana",
  month: "Mese",
};

function ReportTrendMetricPicker({
  metricId,
  options,
  onChange,
}: {
  metricId: string;
  options: readonly string[];
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = getReportBusinessLabel(metricId);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative min-w-0 w-full max-w-md flex-1">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
        Metrica
      </span>
      <button
        type="button"
        className="flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-3 text-left shadow-sm"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        data-testid="primary-trend-metric-select"
      >
        <span className="min-w-0 truncate">
          <span className="block truncate text-sm font-medium text-[color:var(--cab-text)]">{selected.title}</span>
        </span>
        <span className="shrink-0 text-[color:var(--cab-text-muted)]" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <ul
          className="absolute left-0 z-20 mt-1 max-h-72 w-full min-w-[16rem] overflow-auto rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-card)] py-1 shadow-lg"
          role="listbox"
          aria-label="Seleziona metrica"
        >
          {options.map((id) => {
            const label = getReportBusinessLabel(id);
            const hint = getReportBusinessLabelHint(id);
            const active = id === metricId;
            return (
              <li key={id} role="option" aria-selected={active} className="border-b border-[color:var(--cab-border)] last:border-b-0">
                <button
                  type="button"
                  className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition hover:bg-[color:var(--cab-surface-muted)] ${
                    active ? "bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-card))]" : ""
                  }`}
                  onClick={() => {
                    onChange(id);
                    setOpen(false);
                  }}
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                      active
                        ? "border-[color:var(--cab-primary)] bg-[color:var(--cab-primary)] text-white"
                        : "border-[color:var(--cab-border)] bg-transparent text-transparent"
                    }`}
                    aria-hidden
                  >
                    ✓
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium leading-snug text-[color:var(--cab-text)]">
                      {label.title}
                    </span>
                    {hint ? (
                      <span className="mt-0.5 block text-xs leading-snug text-[color:var(--cab-text-muted)]">{hint}</span>
                    ) : (
                      <span className="mt-0.5 block text-xs leading-snug text-[color:var(--cab-text-muted)] opacity-60">
                        —
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function ReportPrimaryTrendContent() {
  const periodCtx = useReportPeriodContext();
  const drill = useReportDrillDown();
  const [granularity, setGranularity] = useState<ReportAnalyticsGranularity>("week");
  const eligible = useMemo(() => listPrimaryTrendEligibleMetrics(granularity), [granularity]);
  const [metricId, setMetricId] = useState("eco_fatturato");
  const compareActive = periodCtx.compareMode !== "none";

  const activeMetric = eligible.includes(metricId) ? metricId : (eligible[0] ?? "eco_fatturato");

  useRegisterAnalyticsSection("primary-trend", "primaryTrend", {
    metricIds: [activeMetric],
    includeSeries: true,
    granularity,
  });

  const { result, envelopesById, isLoading } = useReportAnalyticsContext();
  const series = result?.series.find((s) => s.metricId === activeMetric);
  const envelope = envelopesById.get(activeMetric);
  const businessLabel = getReportBusinessLabel(activeMetric);
  const registry = getRegistryEntry(activeMetric);
  const compareLabel = compareActive
    ? formatCompareLabel(periodCtx.compareMode, periodCtx.range, periodCtx.compareRange)
    : undefined;

  const formattedValue =
    envelope && envelope.trust !== "not_available" && registry
      ? formatReportMetricValue(envelope.metric.value, registry.formatter ?? registry.unit)
      : "—";

  const openDrill = () => {
    if (!isDrilldownSupported(activeMetric)) return;
    drill.openChartDrillDown({
      metricId: activeMetric,
      period: buildAnalyticsPeriodFromContext(periodCtx),
      compareMode: mapUiCompareToEnvelope(periodCtx.compareMode),
    });
  };

  return (
    <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-lg border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-muted)_30%,var(--cab-card))] p-3 sm:flex-row sm:items-end">
          <ReportTrendMetricPicker metricId={activeMetric} options={eligible} onChange={setMetricId} />

          <div className="shrink-0">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
              Granularità
            </span>
            <div
              className="flex h-10 items-center gap-0.5 rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-card)] p-0.5"
              role="group"
              aria-label="Granularità"
            >
              {GRANULARITIES.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`h-full rounded px-3 text-xs font-medium transition ${
                    granularity === g
                      ? "bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-card))] text-[color:var(--cab-text)] shadow-sm"
                      : "text-[color:var(--cab-text-muted)] hover:text-[color:var(--cab-text)]"
                  }`}
                  onClick={() => setGranularity(g)}
                  aria-pressed={granularity === g}
                >
                  {GRANULARITY_LABELS[g]}
                </button>
              ))}
            </div>
          </div>

          {isDrilldownSupported(activeMetric) ? (
            <button
              type="button"
              className="h-10 shrink-0 self-end rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-3 text-xs font-medium text-[color:var(--cab-primary)] transition hover:bg-[color:var(--cab-surface-muted)] sm:ml-auto"
              onClick={openDrill}
              data-testid="primary-trend-drilldown"
            >
              Approfondisci
            </button>
          ) : null}
        </div>

        {!isLoading && envelope ? (
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--cab-text-muted)]">
                Totale periodo
              </p>
              <p className="mt-0.5 text-sm text-[color:var(--cab-text-muted)]">{businessLabel.title}</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-[color:var(--cab-text)]">
                {formattedValue}
              </p>
              <ReportTrustBadge trust={envelope.trust} />
            </div>
          </div>
        ) : null}

        <div className="min-w-0">
          {isLoading ? (
            <div className="h-60 animate-pulse rounded-lg bg-[color:var(--cab-surface-muted)]" aria-hidden />
          ) : (
            <ReportTrendChart
              series={series}
              metricId={activeMetric}
              granularity={granularity}
              embedded
              showTitle={false}
            />
          )}
        </div>

        {envelope && registry && compareActive ? (
          <ReportMetricCompareSection
            compare={envelope.metric.compare}
            unit={envelope.unit}
            trendSemantics={registry.trendSemantics}
            compareRequested
          />
        ) : null}

        <ReportTrustCompareFooter compareLabel={compareLabel} trust={envelope?.trust} />
    </div>
  );
}

export function ReportPrimaryTrendSection() {
  const primaryTrendCopy = getReportSectionCopy("primaryTrend");
  return (
    <ReportAnalysisSectionShell
      title={primaryTrendCopy.title}
      subtitle={primaryTrendCopy.subtitle}
      persistKey="bi-primary-trend"
    >
      <ReportPrimaryTrendContent />
    </ReportAnalysisSectionShell>
  );
}
