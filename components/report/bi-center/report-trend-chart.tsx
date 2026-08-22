"use client";

import type { ReportMetricSeries, ReportAnalyticsGranularity } from "@/lib/report/analytics-engine/types";
import type { ReportValueFormatter } from "@/lib/report/metrics/report-value-formatter";
import { formatReportMetricValue, unitToReportFormatter } from "@/lib/report/metrics/report-value-formatter";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";

const CHART_PRIMARY = "var(--cab-primary)";

type TrendPoint = { label: string; value: number };

function formatTrendBucketLabel(ymd: string, granularity: ReportAnalyticsGranularity): string {
  const d = new Date(`${ymd.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  if (granularity === "month") {
    return d.toLocaleDateString("it-IT", { month: "short", year: "2-digit" });
  }
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

function sparseTrendHint(granularity: ReportAnalyticsGranularity, pointCount: number): string | null {
  if (pointCount >= 2) return null;
  const grain =
    granularity === "day" ? "giornaliera" : granularity === "week" ? "settimanale" : "mensile";
  return `Un solo punto ${grain} nel periodo — allarga il periodo o cambia granularità.`;
}

function TrendBarsChart({
  points,
  formatValue,
}: {
  points: TrendPoint[];
  formatValue: (value: number) => string;
}) {
  const W = 720;
  const H = 248;
  const padL = 44;
  const padR = 20;
  const padT = 32;
  const padB = 44;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = Math.max(points.length, 1);
  const maxY = Math.max(1, ...points.map((p) => p.value));
  const bw = innerW / n;
  const barW = Math.min(36, bw * 0.5);
  const base = padT + innerH;

  const gridSteps = [0, 0.5, 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-60 w-full max-w-full" role="img" aria-label="Trend nel periodo">
      {gridSteps.map((step) => {
        const y = padT + innerH * (1 - step);
        return (
          <line
            key={step}
            x1={padL}
            y1={y}
            x2={W - padR}
            y2={y}
            stroke="currentColor"
            className="text-[color:var(--cab-border)]"
            strokeDasharray={step === 0 ? undefined : "4 4"}
            opacity={step === 0 ? 1 : 0.55}
          />
        );
      })}
      {points.map((p, i) => {
        const cx = padL + bw * i + bw / 2;
        const h = (p.value / maxY) * innerH;
        const y = base - h;
        const formatted = formatValue(p.value);
        return (
          <g key={`${p.label}-${i}`}>
            <rect
              x={cx - barW / 2}
              y={y}
              width={barW}
              height={Math.max(h, 2)}
              fill={CHART_PRIMARY}
              rx={4}
              opacity={0.9}
            >
              <title>{`${p.label}: ${formatted}`}</title>
            </rect>
            <text
              x={cx}
              y={Math.max(padT + 10, y - 6)}
              textAnchor="middle"
              className="fill-[color:var(--cab-text)] font-semibold"
              style={{ fontSize: 11 }}
            >
              {formatted}
            </text>
            <text
              x={cx}
              y={H - 12}
              textAnchor="middle"
              className="fill-[color:var(--cab-text-muted)]"
              style={{ fontSize: 10 }}
            >
              {p.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function TrendLineChart({
  points,
  formatValue,
}: {
  points: TrendPoint[];
  formatValue: (value: number) => string;
}) {
  const W = 720;
  const H = 248;
  const padL = 48;
  const padR = 20;
  const padT = 32;
  const padB = 44;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = Math.max(points.length, 1);
  const maxY = Math.max(1, ...points.map((p) => p.value));
  const base = padT + innerH;

  const coords = points.map((p, i) => {
    const x = padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const y = padT + innerH - (p.value / maxY) * innerH;
    return { ...p, x, y };
  });

  const pathD = coords
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-60 w-full max-w-full" role="img" aria-label="Trend nel periodo">
      <line x1={padL} y1={base} x2={W - padR} y2={base} stroke="currentColor" className="text-[color:var(--cab-border)]" />
      <line
        x1={padL}
        y1={padT + innerH / 2}
        x2={W - padR}
        y2={padT + innerH / 2}
        stroke="currentColor"
        className="text-[color:var(--cab-border)]"
        strokeDasharray="4 4"
        opacity={0.55}
      />
      {pathD ? (
        <path
          d={pathD}
          fill="none"
          stroke={CHART_PRIMARY}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : null}
      {coords.map((p, i) => {
        const formatted = formatValue(p.value);
        const last = i === coords.length - 1;
        return (
          <g key={`${p.label}-${i}`}>
            <circle
              cx={p.x}
              cy={p.y}
              r={last ? 5 : 4}
              fill={last ? CHART_PRIMARY : "var(--cab-card)"}
              stroke={CHART_PRIMARY}
              strokeWidth={2}
            >
              <title>{`${p.label}: ${formatted}`}</title>
            </circle>
            {last ? (
              <text
                x={p.x}
                y={Math.max(padT + 10, p.y - 10)}
                textAnchor="middle"
                className="fill-[color:var(--cab-text)] font-semibold"
                style={{ fontSize: 11 }}
              >
                {formatted}
              </text>
            ) : null}
            <text
              x={p.x}
              y={H - 12}
              textAnchor="middle"
              className="fill-[color:var(--cab-text-muted)]"
              style={{ fontSize: 10 }}
            >
              {p.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function ReportTrendChart({
  series,
  metricId,
  granularity = "week",
  title,
  emptyLabel = "Nessun dato nel periodo",
  embedded = false,
  showTitle = true,
}: {
  series: ReportMetricSeries | undefined;
  metricId?: string;
  granularity?: ReportAnalyticsGranularity;
  title?: string;
  emptyLabel?: string;
  embedded?: boolean;
  showTitle?: boolean;
}) {
  const registry = metricId ? getRegistryEntry(metricId) : undefined;
  const formatter: ReportValueFormatter =
    registry?.formatter ?? (registry?.unit ? unitToReportFormatter(registry.unit) : "integer");
  const useBars = registry?.unit === "count";
  const formatValue = (value: number) => formatReportMetricValue(value, formatter);

  const shellClass = embedded
    ? "flex min-h-[14rem] items-center justify-center rounded-lg bg-[color:color-mix(in_srgb,var(--cab-surface-muted)_40%,transparent)] text-sm text-[color:var(--cab-text-muted)]"
    : "flex min-h-[12rem] items-center justify-center rounded-lg border border-dashed border-[color:var(--cab-border)] text-sm text-[color:var(--cab-text-muted)]";

  if (!series?.points.length) {
    return <div className={shellClass}>{emptyLabel}</div>;
  }

  const points = series.points
    .filter((p) => p.value != null)
    .map((p) => ({
      label: formatTrendBucketLabel(p.periodStart, granularity),
      value: p.value as number,
    }));

  if (points.length === 0) {
    return <div className={shellClass}>Dati non disponibili</div>;
  }

  const hint = sparseTrendHint(granularity, points.length);
  const chart = useBars ? (
    <TrendBarsChart points={points} formatValue={formatValue} />
  ) : (
    <TrendLineChart points={points} formatValue={formatValue} />
  );

  return (
    <div className="space-y-2">
      {showTitle && title ? (
        <p className="text-sm font-semibold text-[color:var(--cab-text)]">{title}</p>
      ) : null}
      {hint ? (
        <p className="rounded-md border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-muted)_50%,var(--cab-card))] px-3 py-2 text-xs leading-relaxed text-[color:var(--cab-text-muted)]">
          {hint}
        </p>
      ) : null}
      <div
        className={
          embedded
            ? "rounded-lg border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-muted)_25%,var(--cab-card))] px-1 py-2 sm:px-2"
            : "rounded-lg border border-[color:var(--cab-border)] p-2"
        }
      >
        {chart}
      </div>
    </div>
  );
}
