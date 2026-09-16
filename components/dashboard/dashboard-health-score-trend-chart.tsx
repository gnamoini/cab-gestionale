"use client";

import { useEffect, useMemo, useState } from "react";
import type { OperationalHealthTone } from "@/lib/dashboard/operational-health-score";
import { HealthScoreRingLoading } from "@/components/dashboard/health-score-ring-loading";
import {
  dsTypoBody,
  dsTypoCaption,
} from "@/lib/ui/design-system";
import { chartCssVars, useChartHover, useChartStable, useYScale } from "@/src/components/charts/chart-context";
import { AreaChart } from "@/src/components/charts/area-chart";
import { Area } from "@/src/components/charts/area";
import { Grid } from "@/src/components/charts/grid";
import { ChartTooltip } from "@/src/components/charts/tooltip/chart-tooltip";
import { ChartCrosshairLayer } from "@/src/components/charts/tooltip/chart-crosshair-layer";
import { XAxis } from "@/src/components/charts/x-axis";
import { YAxis } from "@/src/components/charts/y-axis";

export type HealthScoreWeeklyTrendPoint = {
  weekLabel: string;
  weekStart: string;
  weekEnd: string;
  score: number | null;
  tone: OperationalHealthTone;
  label: string;
};

const TONE_COLOR: Record<OperationalHealthTone, string> = {
  excellent: "var(--cab-success)",
  good: "var(--cab-primary)",
  warn: "var(--cab-warning)",
  critical: "var(--cab-danger)",
  neutral: "var(--cab-text-muted)",
};

const CHART_MARGIN = { top: 16, right: 12, bottom: 28, left: 36 } as const;
/** Bklit y-domain uses max×1.1 — 100/1.1 pins the scale at 0…100 like the legacy SVG. */
const HEALTH_SCORE_Y_DOMAIN_MAX = 100 / 1.1;

function formatWeekLabel(weekStart: string): string {
  const d = new Date(weekStart);
  if (Number.isNaN(d.getTime())) return weekStart;
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

function formatPointTooltip(weekEnd: string, score: number): string {
  return `${formatWeekLabel(weekEnd)} · ${score}/100`;
}

function healthScoreTrendChartRows(points: HealthScoreWeeklyTrendPoint[]) {
  return points
    .map((p, pointIndex) => ({ ...p, pointIndex }))
    .filter((p): p is HealthScoreWeeklyTrendPoint & { pointIndex: number; score: number } => p.score != null)
    .map((p) => ({
      date: `${p.weekEnd.slice(0, 10)}T12:00:00.000Z`,
      score: p.score,
      tone: p.tone,
      weekEnd: p.weekEnd,
      pointIndex: p.pointIndex,
      ariaLabel: `Settimana fino a ${formatWeekLabel(p.weekEnd)}: ${p.score} ${p.label}`,
    }));
}

function HealthScoreTrendHoverBridge({
  onHoverIndex,
}: {
  onHoverIndex: (index: number | null) => void;
}) {
  const { tooltipData } = useChartHover();
  useEffect(() => {
    const raw = tooltipData?.point?.pointIndex;
    onHoverIndex(typeof raw === "number" ? raw : null);
  }, [tooltipData, onHoverIndex]);
  return null;
}

function toneMarkerColor(tone: unknown): string {
  if (typeof tone === "string" && tone in TONE_COLOR) {
    return TONE_COLOR[tone as OperationalHealthTone];
  }
  return TONE_COLOR.good;
}

/** Per-point markers colored by operational tone (Bklit Line markers are single-color). */
function HealthScoreToneMarkers({ dataKey }: { dataKey: string }) {
  const { data, xScale, xAccessor, isLoaded } = useChartStable();
  const { tooltipData } = useChartHover();
  const yScale = useYScale();
  const activeIndex = tooltipData?.index ?? null;

  if (!isLoaded) return null;

  return (
    <g className="pointer-events-none">
      {data.map((row, i) => {
        const score = row[dataKey];
        if (typeof score !== "number") return null;
        const cx = xScale(xAccessor(row)) ?? 0;
        const cy = yScale(score) ?? 0;
        const color = toneMarkerColor(row.tone);
        const isLatest = i === data.length - 1;
        const active = activeIndex === i;
        const baseR = isLatest ? 3.25 : 2.75;
        const r = active ? baseR + 1 : baseR;
        const pointIndex = row.pointIndex;
        const key = typeof pointIndex === "number" ? pointIndex : i;

        return (
          <g key={key}>
            {active ? <circle cx={cx} cy={cy} r={r + 2.5} fill={color} opacity={0.12} /> : null}
            <circle
              cx={cx}
              cy={cy}
              r={r}
              stroke={color}
              strokeWidth={active ? 1.5 : 1.25}
              fill={`color-mix(in srgb, ${color} 88%, var(--cab-card))`}
            />
          </g>
        );
      })}
    </g>
  );
}

function HealthScoreTrendChartSvg({
  points,
  onHoverIndex,
  hoverIndex: _hoverIndex,
  embedded = false,
}: {
  points: HealthScoreWeeklyTrendPoint[];
  hoverIndex: number | null;
  onHoverIndex: (index: number | null) => void;
  embedded?: boolean;
}) {
  const chartData = useMemo(() => healthScoreTrendChartRows(points), [points]);
  const latest = chartData[chartData.length - 1];
  const latestColor = latest ? TONE_COLOR[latest.tone] : TONE_COLOR.good;

  if (chartData.length === 0) return null;

  return (
    <div
      className={
        embedded
          ? "flex min-h-40 w-full flex-col justify-center xl:min-h-0 xl:flex-1 xl:basis-0"
          : "relative min-h-[12.5rem] min-w-0"
      }
      role="img"
      aria-label="Andamento settimanale dello stato operativo negli ultimi 6 mesi"
      onPointerLeave={() => onHoverIndex(null)}
    >
      <AreaChart
        className="block max-h-full min-h-[10rem] w-full"
        data={chartData}
        margin={CHART_MARGIN}
        xDataKey="date"
        yScaleDomainMax={HEALTH_SCORE_Y_DOMAIN_MAX}
        yDomainTween={false}
        animationDuration={900}
        aspectRatio="520 / 300"
        style={embedded ? { height: "100%", aspectRatio: "unset", minHeight: "10rem" } : undefined}
      >
        <Grid horizontal rowTickValues={[0, 50, 100]} strokeDasharray="2 5" stroke={chartCssVars.grid} />
        <Area
          dataKey="score"
          fill={latestColor}
          fillOpacity={0.16}
          stroke={latestColor}
          strokeWidth={1.75}
        />
        <HealthScoreToneMarkers dataKey="score" />
        <ChartCrosshairLayer
          fadeEdges="none"
          spanXAxisMargin={false}
          color={(point) => toneMarkerColor(point.tone)}
        />
        <XAxis />
        <YAxis numTicks={3} formatValue={(v) => String(Math.round(v))} />
        <ChartTooltip
          showCrosshair={false}
          showDatePill={false}
          showDots={false}
          indicatorFadeEdges="none"
          indicatorColor={(point) => toneMarkerColor(point.tone)}
          content={({ point }) => (
            <div className="rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md">
              {formatPointTooltip(String(point.weekEnd ?? ""), Number(point.score))}
            </div>
          )}
        />
        <HealthScoreTrendHoverBridge onHoverIndex={onHoverIndex} />
      </AreaChart>
    </div>
  );
}

export function HealthScoreWeeklyTrendChart({
  points,
  isLoading,
  embedded = false,
  hideTitle = false,
}: {
  points: HealthScoreWeeklyTrendPoint[] | null | undefined;
  isLoading: boolean;
  embedded?: boolean;
  hideTitle?: boolean;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const validPoints = points?.filter((p) => p.score != null) ?? [];
  const hovered = hoverIndex != null ? points?.[hoverIndex] : null;
  const latest = validPoints[validPoints.length - 1];
  const latestColor = latest ? TONE_COLOR[latest.tone] : TONE_COLOR.good;

  if (isLoading) {
    const loadingBody = (
      <div
        className={`flex flex-col items-center justify-center gap-3 ${embedded ? "min-h-40 py-2 xl:min-h-0 xl:flex-1" : "min-h-[13rem] rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_25%,var(--cab-card))] px-4 py-6"}`}
      >
        <HealthScoreRingLoading />
        <p className={`${dsTypoCaption} text-[color:var(--cab-text-muted)]`}>Caricamento andamento…</p>
      </div>
    );
    return loadingBody;
  }

  if (!points || validPoints.length === 0) {
    const emptyBody = (
      <div
        className={`flex items-center justify-center ${embedded ? "min-h-40 py-2 xl:min-h-0 xl:flex-1" : "min-h-[13rem] rounded-[var(--ds-radius-lg)] border border-dashed border-[color:var(--cab-border)] px-4 py-6"}`}
      >
        <p className={`${dsTypoBody} text-center text-[color:var(--cab-text-muted)]`}>
          Dati insufficienti per mostrare l&apos;andamento settimanale.
        </p>
      </div>
    );
    return emptyBody;
  }

  const chartHeader = hideTitle ? null : (
    <div className="mb-2 flex min-w-0 items-baseline justify-between gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
        Andamento settimanale
      </p>
      {hovered?.score != null ? (
        <p className="shrink-0 text-xs font-semibold tabular-nums text-[color:var(--cab-text)]">
          <span style={{ color: TONE_COLOR[hovered.tone] }}>{hovered.score}</span>
          <span className="text-[color:var(--cab-text-muted)]">/100</span>
          <span className="mx-1 text-[color:var(--cab-text-muted)]">·</span>
          {formatWeekLabel(hovered.weekEnd)}
        </p>
      ) : latest ? (
        <p className="shrink-0 text-xs font-semibold tabular-nums">
          <span style={{ color: latestColor }}>{latest.score}</span>
          <span className="text-[color:var(--cab-text-muted)]">/100</span>
          <span className="ms-1.5 font-medium text-[color:var(--cab-text-muted)]">ultima settimana</span>
        </p>
      ) : (
        <p className={`${dsTypoCaption} shrink-0 text-[color:var(--cab-text-muted)]`}>Ultimi 6 mesi</p>
      )}
    </div>
  );

  const chartBody = (
    <>
      {chartHeader}
      <HealthScoreTrendChartSvg
        points={points}
        hoverIndex={hoverIndex}
        onHoverIndex={setHoverIndex}
        embedded={embedded}
      />
    </>
  );

  if (embedded) {
    return <div className="flex min-h-40 w-full flex-col xl:min-h-0 xl:flex-1 xl:basis-0 min-w-0">{chartBody}</div>;
  }

  return (
    <div
      className="min-w-0 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] px-3 py-3"
      style={{
        background: `radial-gradient(ellipse 90% 70% at 50% 0%, color-mix(in srgb, ${latestColor} 10%, var(--cab-card)) 0%, color-mix(in srgb, var(--cab-surface-2) 22%, var(--cab-card)) 72%)`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${latestColor} 10%, transparent), 0 0 24px color-mix(in srgb, ${latestColor} 8%, transparent)`,
      }}
    >
      {chartBody}
    </div>
  );
}
