"use client";

import { ReportVisualization } from "@/components/report/design-system/layout/visualization";
import type { MarginWaterfallStep } from "@/lib/report/economic-analytics-extended";

import { reportChartSeriesColor } from "@/lib/report/ui/report-chart-theme";

function fmtEur(n: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
    Math.abs(n),
  );
}

export function ReportMarginWaterfallChart({
  steps,
  title = "Waterfall margine operativo",
}: {
  steps: readonly MarginWaterfallStep[];
  title?: string;
}) {
  if (steps.length === 0) {
    return (
      <ReportVisualization title={title}>
        <p className="text-sm text-[color:var(--cab-text-muted)]">Dati costi non disponibili.</p>
      </ReportVisualization>
    );
  }

  const W = 720;
  const H = 240;
  const padL = 16;
  const padR = 16;
  const padT = 16;
  const padB = 56;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = steps.length;
  const bw = innerW / n;
  const maxAbs = Math.max(1, ...steps.map((s) => Math.abs(s.value)));

  return (
    <ReportVisualization title={title}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full max-w-full" role="img" aria-label={title}>
        <line
          x1={padL}
          y1={padT + innerH}
          x2={W - padR}
          y2={padT + innerH}
          stroke="currentColor"
          className="text-[color:var(--cab-border)]"
        />
        {steps.map((step, i) => {
          const cx = padL + bw * i + bw / 2;
          const h = (Math.abs(step.value) / maxAbs) * innerH * 0.85;
          const y = padT + innerH - h;
          const fill =
            step.kind === "total"
              ? reportChartSeriesColor("secondary")
              : step.kind === "result"
                ? step.value >= 0
                  ? reportChartSeriesColor("accent")
                  : "var(--cab-danger)"
                : reportChartSeriesColor("primary");
          return (
            <g key={step.id}>
              <rect x={cx - bw * 0.28} y={y} width={bw * 0.56} height={h} fill={fill} rx={4}>
                <title>{`${step.label}: ${fmtEur(step.value)}`}</title>
              </rect>
              <text
                x={cx}
                y={H - 12}
                textAnchor="middle"
                className="fill-[color:var(--cab-text-muted)]"
                style={{ fontSize: 9 }}
              >
                {step.label}
              </text>
            </g>
          );
        })}
      </svg>
    </ReportVisualization>
  );
}
