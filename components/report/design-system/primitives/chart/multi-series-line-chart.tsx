"use client";

import { memo, useId, useMemo } from "react";
import type { KpiChartDisplayMode } from "@/lib/report/metrics/report-metric-types";
import type { ReportMetricUnit } from "@/lib/report/metrics/report-metric-types";
import {
  formatReportMetricValue,
  unitToReportFormatter,
  type ReportValueFormatter,
} from "@/lib/report/metrics/report-value-formatter";
import {
  resolveSeriesAxisExtents,
  seriesAxisSide,
  valueToChartY,
} from "@/lib/report/multi-series-chart-scale";

export const KPI_CHART_SERIES_COLORS = [
  "#0ea5e9",
  "#f97316",
  "#22c55e",
  "#a855f7",
  "#ef4444",
] as const;

export type MultiSeriesLineChartPoint = {
  date: string;
  displayValue: number | null;
  realValue: number | null;
};

export type MultiSeriesLineChartSeries = {
  id: string;
  label: string;
  color: string;
  unit: ReportMetricUnit;
  points: MultiSeriesLineChartPoint[];
  axis?: "left" | "right";
};

function formatDateLabel(ymd: string): string {
  const [, mo, da] = ymd.split("-");
  return `${da}/${mo}`;
}

function ReportMultiSeriesLineChartInner({
  series,
  displayMode,
}: {
  series: MultiSeriesLineChartSeries[];
  displayMode: KpiChartDisplayMode;
}) {
  const W = 720;
  const H = 280;
  const padL = 48;
  const padR = displayMode === "dual-axis" ? 48 : 16;
  const padT = 24;
  const padB = 56;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const dates = useMemo(() => {
    const set = new Set<string>();
    for (const s of series) for (const p of s.points) set.add(p.date);
    return [...set].sort();
  }, [series]);

  const leftExtent = useMemo(
    () => resolveSeriesAxisExtents(series, displayMode, "left"),
    [series, displayMode],
  );
  const rightExtent = useMemo(
    () => resolveSeriesAxisExtents(series, displayMode, "right"),
    [series, displayMode],
  );

  const clipId = useId();

  if (dates.length === 0) {
    return (
      <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun dato nel periodo selezionato.</p>
    );
  }

  const n = Math.max(dates.length - 1, 1);
  const xAt = (i: number) => padL + (i / n) * innerW;
  const yForSeries = (s: MultiSeriesLineChartSeries, v: number) => {
    const extent = seriesAxisSide(s, displayMode) === "right" ? rightExtent : leftExtent;
    return valueToChartY(v, extent, padT, innerH);
  };

  const labelStep = Math.max(1, Math.ceil(dates.length / 8));

  return (
    <div className="min-w-0 space-y-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-64 w-full max-w-full overflow-hidden"
        role="img"
        aria-label="Grafico KPI multi-serie"
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={padL} y={padT} width={innerW} height={innerH} />
          </clipPath>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const gy = padT + innerH * (1 - t);
          return (
            <line
              key={gy}
              x1={padL}
              y1={gy}
              x2={W - padR}
              y2={gy}
              stroke="currentColor"
              className="text-[color:color-mix(in_srgb,var(--cab-border)_65%,transparent)]"
              strokeDasharray="3 5"
            />
          );
        })}
        <line x1={padL} y1={padT + innerH} x2={W - padR} y2={padT + innerH} stroke="currentColor" className="text-[color:var(--cab-border)]" />

        <g clipPath={`url(#${clipId})`}>
        {series.map((s) => {
          const formatter = unitToReportFormatter(s.unit);
          const pts = s.points
            .map((p) => {
              const idx = dates.indexOf(p.date);
              if (idx < 0 || p.displayValue == null) return null;
              return { ...p, px: xAt(idx), py: yForSeries(s, p.displayValue) };
            })
            .filter(Boolean) as (MultiSeriesLineChartPoint & { px: number; py: number })[];

          const line = pts.map((p) => `${p.px},${p.py}`).join(" ");
          return (
            <g key={s.id}>
              {line ? (
                <polyline
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={line}
                />
              ) : null}
              {pts.map((p) => (
                <circle key={`${s.id}-${p.date}`} cx={p.px} cy={p.py} r={4} fill={s.color}>
                  <title>
                    {`${s.label} · ${formatDateLabel(p.date)}: ${formatReportMetricValue(p.realValue ?? 0, formatter)}`}
                    {displayMode === "indexed" ? ` (indice ${p.displayValue})` : ""}
                  </title>
                </circle>
              ))}
            </g>
          );
        })}
        </g>

        {dates.map((d, i) =>
          i % labelStep === 0 || i === dates.length - 1 ? (
            <text
              key={d}
              x={xAt(i)}
              y={H - 12}
              textAnchor="middle"
              className="fill-[color:var(--cab-text-muted)]"
              style={{ fontSize: 11 }}
            >
              {formatDateLabel(d)}
            </text>
          ) : null,
        )}
      </svg>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[color:var(--cab-text)]">
        {series.map((s) => (
          <li key={s.id} className="inline-flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
            <span>{s.label}</span>
            {displayMode === "dual-axis" ? (
              <span className="text-[color:var(--cab-text-muted)]">({s.axis === "right" ? "asse destro" : "asse sinistro"})</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export const ReportMultiSeriesLineChart = memo(ReportMultiSeriesLineChartInner);

export function seriesFormatter(unit: ReportMetricUnit): ReportValueFormatter {
  return unitToReportFormatter(unit);
}
