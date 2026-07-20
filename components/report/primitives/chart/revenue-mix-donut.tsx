"use client";

import { ReportVisualization } from "@/components/report/design-system/layout/visualization";
import type { RevenueMixSlice } from "@/lib/report/economic-analytics-extended";

const COLORS = ["#0ea5e9", "#f97316", "#22c55e", "#a855f7", "#ef4444", "#71717a"] as const;

export function ReportRevenueMixDonut({
  slices,
  title = "Mix ricavi",
}: {
  slices: readonly RevenueMixSlice[];
  title?: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total <= 0) {
    return (
      <ReportVisualization title={title}>
        <p className="text-sm text-[color:var(--cab-text-muted)]">Nessuna riga fattura nel periodo.</p>
      </ReportVisualization>
    );
  }

  const cx = 120;
  const cy = 120;
  const r = 72;
  const ir = 44;
  let angle = -Math.PI / 2;

  const arcs = slices.map((slice, i) => {
    const frac = slice.value / total;
    const sweep = frac * Math.PI * 2;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    angle += sweep;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const ix1 = cx + ir * Math.cos(angle - sweep);
    const iy1 = cy + ir * Math.sin(angle - sweep);
    const ix2 = cx + ir * Math.cos(angle);
    const iy2 = cy + ir * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${ir} ${ir} 0 ${large} 0 ${ix1} ${iy1} Z`;
    return { slice, d, color: COLORS[i % COLORS.length]!, pct: Math.round(frac * 1000) / 10 };
  });

  return (
    <ReportVisualization title={title}>
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
        <svg viewBox="0 0 240 240" className="mx-auto h-48 w-48 shrink-0" role="img" aria-label={title}>
          {arcs.map(({ slice, d, color, pct }) => (
            <path key={slice.id} d={d} fill={color}>
              <title>{`${slice.label}: ${pct}%`}</title>
            </path>
          ))}
        </svg>
        <ul className="min-w-0 flex-1 space-y-1 text-sm">
          {arcs.map(({ slice, color, pct }) => (
            <li key={slice.id} className="flex items-center justify-between gap--2">
              <span className="flex min-w-0 items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                <span className="truncate">{slice.label}</span>
              </span>
              <span className="shrink-0 tabular-nums text-[color:var(--cab-text-muted)]">{pct}%</span>
            </li>
          ))}
        </ul>
      </div>
    </ReportVisualization>
  );
}
