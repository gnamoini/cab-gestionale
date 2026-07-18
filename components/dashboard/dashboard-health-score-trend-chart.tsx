"use client";

import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { OperationalHealthTone } from "@/lib/dashboard/operational-health-score";
import { HealthScoreRingLoading } from "@/components/dashboard/health-score-ring-loading";
import {
  dsTooltipContent,
  dsTooltipPortalHidden,
  dsTooltipPortalVisible,
  dsTypoBody,
  dsTypoCaption,
  dsZTooltip,
} from "@/lib/ui/design-system";
import {
  CAB_TOOLTIP_PORTAL_ATTR,
  getTooltipPortalContainer,
  TOOLTIP_VIEWPORT_PAD,
  tooltipPortalInlineStyle,
} from "@/lib/ui/tooltip-portal";

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

const CHART_VIEW_WIDTH = 400;
const CHART_VIEW_HEIGHT = 200;
/** Embedded: viewBox più largo/alto → assi più lunghi senza distorcere il grafico. */
const CHART_VIEW_WIDTH_EMBEDDED = 520;
const CHART_VIEW_HEIGHT_EMBEDDED = 300;
const CHART_HEIGHT_DEFAULT = CHART_VIEW_HEIGHT;
const CHART_EMBEDDED_MIN_H = "10rem";
const PAD_LEFT = 32;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;

const CHART_PADS = {
  left: PAD_LEFT,
  right: PAD_RIGHT,
  top: PAD_TOP,
  bottom: PAD_BOTTOM,
} as const;

function formatWeekLabel(weekStart: string): string {
  const d = new Date(weekStart);
  if (Number.isNaN(d.getTime())) return weekStart;
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

function formatMonthLabel(weekStart: string): string {
  const d = new Date(weekStart);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("it-IT", { month: "short" });
}

function formatPointTooltip(weekStart: string, score: number): string {
  return `${formatWeekLabel(weekStart)} · ${score}/100`;
}

function toneGlowFilter(color: string, strength = 0.55): string {
  return `drop-shadow(0 0 4px color-mix(in srgb, ${color} ${Math.round(strength * 100)}%, transparent))`;
}

const CHART_POINT_TOOLTIP_GAP = 12;

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function chartPointToScreen(svg: SVGSVGElement, x: number, y: number): { x: number; y: number } | null {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const pt = new DOMPoint(x, y).matrixTransform(ctm);
  return { x: pt.x, y: pt.y };
}

/** Tooltip sempre sopra il puntino (verso l'alto sullo schermo). */
function HealthScoreChartPointTooltip({
  open,
  svgRef,
  anchorX,
  anchorY,
  dotRadius,
  content,
  anchorKey,
}: {
  open: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
  anchorX: number;
  anchorY: number;
  dotRadius: number;
  content: string;
  anchorKey: number | null;
}) {
  const tipRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const tip = tipRef.current;
    const svg = svgRef.current;
    if (!open || !content.trim() || !svg || !tip) {
      setCoords(null);
      return;
    }

    const center = chartPointToScreen(svg, anchorX, anchorY);
    const topEdge = chartPointToScreen(svg, anchorX, anchorY - dotRadius);
    if (!center || !topEdge) {
      setCoords(null);
      return;
    }

    const placeTooltip = () => {
      const tipW = tip.offsetWidth;
      const tipH = tip.offsetHeight;
      if (tipW === 0 && tipH === 0) return false;

      const anchorBottom = topEdge.y - CHART_POINT_TOOLTIP_GAP;
      const top = clamp(
        anchorBottom - tipH,
        TOOLTIP_VIEWPORT_PAD,
        Math.max(TOOLTIP_VIEWPORT_PAD, window.innerHeight - TOOLTIP_VIEWPORT_PAD - tipH),
      );
      const left = clamp(
        center.x - tipW / 2,
        TOOLTIP_VIEWPORT_PAD,
        Math.max(TOOLTIP_VIEWPORT_PAD, window.innerWidth - TOOLTIP_VIEWPORT_PAD - tipW),
      );

      setCoords({ top, left });
      return true;
    };

    if (!placeTooltip()) {
      const raf = requestAnimationFrame(() => {
        placeTooltip();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [open, content, anchorKey, anchorX, anchorY, dotRadius, svgRef]);

  if (!open || !content.trim() || typeof document === "undefined") return null;

  const placed = coords != null;

  return createPortal(
    <div
      ref={tipRef}
      role="tooltip"
      {...{ [CAB_TOOLTIP_PORTAL_ATTR]: "" }}
      className={`${dsTooltipContent} ${dsZTooltip} ${placed ? dsTooltipPortalVisible : dsTooltipPortalHidden}`}
      style={{
        ...tooltipPortalInlineStyle("top"),
        top: coords?.top ?? -9999,
        left: coords?.left ?? -9999,
        visibility: placed ? "visible" : "hidden",
      }}
    >
      {content}
    </div>,
    getTooltipPortalContainer(),
  );
}

function HealthScoreTrendChartSvg({
  points,
  onHoverIndex,
  hoverIndex,
  embedded = false,
}: {
  points: HealthScoreWeeklyTrendPoint[];
  hoverIndex: number | null;
  onHoverIndex: (index: number | null) => void;
  embedded?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const areaGradId = `hs-trend-area-${uid}`;
  const lineGradId = `hs-trend-line-${uid}`;
  const viewWidth = embedded ? CHART_VIEW_WIDTH_EMBEDDED : CHART_VIEW_WIDTH;
  const viewHeight = embedded ? CHART_VIEW_HEIGHT_EMBEDDED : CHART_VIEW_HEIGHT;

  const plotPoints = useMemo(
    () =>
      points
        .map((p, index) => ({ ...p, index }))
        .filter((p): p is HealthScoreWeeklyTrendPoint & { index: number; score: number } => p.score != null),
    [points],
  );

  const pads = CHART_PADS;
  const plotW = viewWidth - pads.left - pads.right;
  const plotH = viewHeight - pads.top - pads.bottom;

  const coords = plotPoints.map((p, i) => {
    const x = pads.left + (plotPoints.length <= 1 ? plotW / 2 : (i / (plotPoints.length - 1)) * plotW);
    const y = pads.top + plotH - (p.score / 100) * plotH;
    return { ...p, x, y };
  });

  const linePath = coords.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath =
    coords.length > 0
      ? `M ${coords[0]!.x} ${pads.top + plotH} L ${coords.map((p) => `${p.x} ${p.y}`).join(" L ")} L ${coords[coords.length - 1]!.x} ${pads.top + plotH} Z`
      : "";

  const latestTone = coords[coords.length - 1]?.tone ?? "good";
  const latestColor = TONE_COLOR[latestTone];

  const monthLabels = useMemo(() => {
    const labels: { x: number; label: string; key: string }[] = [];
    let lastMonth = "";
    for (const p of coords) {
      const month = formatMonthLabel(p.weekStart);
      if (month && month !== lastMonth) {
        labels.push({ x: p.x, label: month, key: `${p.weekLabel}-${month}` });
        lastMonth = month;
      }
    }
    return labels;
  }, [coords]);

  const yTicks = [0, 50, 100];
  const hitR = 10;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const hoveredCoord = hoverIndex != null ? coords.find((c) => c.index === hoverIndex) : null;
  const hoveredDotRadius =
    hoveredCoord != null
      ? (coords.findIndex((c) => c.index === hoverIndex) === coords.length - 1 ? 3.25 : 2.75) + 2.5
      : 0;
  const tooltipContent =
    hoveredCoord != null ? formatPointTooltip(hoveredCoord.weekStart, hoveredCoord.score) : "";

  const monthLabelY = viewHeight - 6;

  return (
    <div
      className={
        embedded ? "flex min-h-0 w-full flex-1 basis-0 flex-col justify-center" : "relative min-w-0"
      }
      style={embedded ? { minHeight: CHART_EMBEDDED_MIN_H } : undefined}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        width="100%"
        height={embedded ? "100%" : CHART_HEIGHT_DEFAULT}
        preserveAspectRatio="xMidYMid meet"
        className="block max-h-full w-full overflow-visible"
        role="img"
        aria-label="Andamento settimanale dello stato operativo negli ultimi 6 mesi"
        onPointerLeave={() => onHoverIndex(null)}
      >
        <defs>
          <linearGradient id={areaGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={latestColor} stopOpacity={0.14} />
            <stop offset="85%" stopColor={latestColor} stopOpacity={0.03} />
            <stop offset="100%" stopColor={latestColor} stopOpacity={0} />
          </linearGradient>
          <linearGradient id={lineGradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={TONE_COLOR[coords[0]?.tone ?? "neutral"]} stopOpacity={0.45} />
            <stop offset="100%" stopColor={latestColor} stopOpacity={0.9} />
          </linearGradient>
        </defs>

        <rect
          x={pads.left}
          y={pads.top}
          width={plotW}
          height={plotH}
          rx={8}
          fill="transparent"
          className="stroke-[color:color-mix(in_srgb,var(--cab-border)_55%,transparent)]"
          strokeWidth={1}
        />

        {yTicks.map((tick) => {
          const y = pads.top + plotH - (tick / 100) * plotH;
          return (
            <g key={tick}>
              <line
                x1={pads.left}
                y1={y}
                x2={viewWidth - pads.right}
                y2={y}
                className="stroke-[color:color-mix(in_srgb,var(--cab-border)_50%,transparent)]"
                strokeWidth={1}
                strokeDasharray={tick === 100 ? undefined : "2 5"}
              />
              <text
                x={pads.left - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-[color:var(--cab-text-muted)] text-[9px] font-medium tabular-nums"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {areaPath ? <path d={areaPath} fill={`url(#${areaGradId})`} /> : null}

        {coords.length > 1 ? (
          <polyline
            points={linePath}
            fill="none"
            stroke={`url(#${lineGradId})`}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: toneGlowFilter(latestColor, 0.35) }}
          />
        ) : null}

        {monthLabels.map((m) => (
          <text
            key={m.key}
            x={m.x}
            y={monthLabelY}
            textAnchor="middle"
            className="fill-[color:var(--cab-text-muted)] text-[9px] font-medium capitalize"
          >
            {m.label}
          </text>
        ))}

        {coords.map((p, i) => {
          const active = hoverIndex === p.index;
          const isLatest = i === coords.length - 1;
          const color = TONE_COLOR[p.tone];
          const baseR = isLatest ? 3.25 : 2.75;
          const r = active ? baseR + 1 : baseR;

          return (
            <g key={`${p.weekLabel}-${p.index}`} className="pointer-events-none">
              {active ? (
                <circle cx={p.x} cy={p.y} r={r + 2.5} fill={color} opacity={0.12} />
              ) : null}
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                stroke={color}
                strokeWidth={active ? 1.5 : 1.25}
                style={{
                  fill: `color-mix(in srgb, ${color} 88%, var(--cab-card))`,
                  filter: active ? toneGlowFilter(color, 0.55) : undefined,
                }}
              />
            </g>
          );
        })}

        {coords.map((p) => (
          <circle
            key={`hit-${p.weekLabel}-${p.index}`}
            cx={p.x}
            cy={p.y}
            r={hitR}
            fill="transparent"
            className="cursor-pointer touch-manipulation outline-none"
            role="button"
            tabIndex={0}
            aria-label={`Settimana ${formatWeekLabel(p.weekStart)}: ${p.score} ${p.label}`}
            onPointerEnter={() => onHoverIndex(p.index)}
            onFocus={() => onHoverIndex(p.index)}
            onBlur={() => onHoverIndex(null)}
          />
        ))}
      </svg>

      <HealthScoreChartPointTooltip
        open={hoverIndex != null}
        svgRef={svgRef}
        anchorX={hoveredCoord?.x ?? 0}
        anchorY={hoveredCoord?.y ?? 0}
        dotRadius={hoveredDotRadius}
        content={tooltipContent}
        anchorKey={hoverIndex}
      />
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
  /** Dentro `HealthScoreCard` — niente bordo/sfondo esterno duplicato. */
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
        className={`flex flex-col items-center justify-center gap-3 ${embedded ? "min-h-0 flex-1 py-2" : "min-h-[13rem] rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_25%,var(--cab-card))] px-4 py-6"}`}
        style={embedded ? { minHeight: CHART_EMBEDDED_MIN_H } : undefined}
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
        className={`flex items-center justify-center ${embedded ? "min-h-0 flex-1 py-2" : "min-h-[13rem] rounded-[var(--ds-radius-lg)] border border-dashed border-[color:var(--cab-border)] px-4 py-6"}`}
        style={embedded ? { minHeight: CHART_EMBEDDED_MIN_H } : undefined}
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
          {formatWeekLabel(hovered.weekStart)}
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
    return <div className="flex min-h-0 flex-1 basis-0 flex-col">{chartBody}</div>;
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
