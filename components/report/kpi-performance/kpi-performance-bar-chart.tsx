"use client";

import { memo } from "react";
import { reportChartShellClass } from "@/components/report/report-ui-tokens";
import type { KpiPerformanceMonthPoint } from "@/lib/report/kpi-performance/kpi-performance-types";

function KpiPerformanceBarChartInner({
  points,
  ariaLabel,
  barClassName = "fill-[color:var(--cab-primary)]",
}: {
  points: KpiPerformanceMonthPoint[];
  ariaLabel: string;
  barClassName?: string;
}) {
  if (points.length === 0) {
    return <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun dato nel periodo.</p>;
  }

  const W = 640;
  const H = 200;
  const padL = 36;
  const padR = 12;
  const padT = 12;
  const padB = 48;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const maxY = Math.max(1, ...points.map((p) => p.value));
  const slot = innerW / points.length;
  const barW = Math.max(4, slot * 0.55);
  const midY = Math.round(maxY / 2);

  return (
    <div className={reportChartShellClass}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-48 w-full max-w-full" role="img" aria-label={ariaLabel}>
        <line
          x1={padL}
          y1={padT + innerH}
          x2={W - padR}
          y2={padT + innerH}
          stroke="currentColor"
          className="text-[color:var(--cab-border)]"
        />
        <text x={padL - 4} y={padT + innerH + 4} textAnchor="end" className="fill-[color:var(--cab-text-muted)] text-[9px]">
          0
        </text>
        <text x={padL - 4} y={padT + innerH / 2 + 3} textAnchor="end" className="fill-[color:var(--cab-text-muted)] text-[9px]">
          {midY}
        </text>
        <text x={padL - 4} y={padT + 4} textAnchor="end" className="fill-[color:var(--cab-text-muted)] text-[9px]">
          {maxY}
        </text>
        {points.map((p, i) => {
          const h = (p.value / maxY) * innerH;
          const x = padL + i * slot + (slot - barW) / 2;
          const y = padT + innerH - h;
          return (
            <g key={p.monthKey}>
              <rect x={x} y={y} width={barW} height={Math.max(0, h)} rx={3} className={barClassName}>
                <title>{`${p.label}: ${p.value}`}</title>
              </rect>
              <text
                x={x + barW / 2}
                y={H - 8}
                textAnchor="middle"
                className="fill-[color:var(--cab-text-muted)] text-[9px]"
              >
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export const KpiPerformanceBarChart = memo(KpiPerformanceBarChartInner);
