"use client";

import { ReportVisualization } from "@/components/report/design-system/layout/visualization";
import type { AgingBacklogBucket } from "@/lib/report/lavorazioni-work-orders";
import { agingBucketLabel } from "@/lib/report/lavorazioni-work-orders";
import type { AgingStackedSeries } from "@/lib/report/lavorazioni-work-orders";

const BUCKETS: AgingBacklogBucket[] = ["0-7", "8-14", "15-30", "30+"];
const FALLBACK_COLORS = ["#0ea5e9", "#22c55e", "#f97316", "#a855f7", "#ef4444", "#71717a"];

export function ReportAgingBacklogStackedChart({
  series,
  title = "Aging backlog per stato",
}: {
  series: readonly AgingStackedSeries[];
  title?: string;
}) {
  const total = series.reduce(
    (s, row) => s + row.values["0-7"] + row.values["8-14"] + row.values["15-30"] + row.values["30+"],
    0,
  );
  if (total === 0) {
    return (
      <ReportVisualization title={title}>
        <p className="text-sm text-[color:var(--cab-text-muted)]">Nessuna lavorazione aperta.</p>
      </ReportVisualization>
    );
  }

  const W = 720;
  const H = 260;
  const padL = 120;
  const padR = 16;
  const padT = 16;
  const padB = 40;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const rowH = innerH / Math.max(series.length, 1);
  const maxTotal = Math.max(
    1,
    ...series.map((r) => r.values["0-7"] + r.values["8-14"] + r.values["15-30"] + r.values["30+"]),
  );

  return (
    <ReportVisualization title={title}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-64 w-full max-w-full" role="img" aria-label={title}>
        {series.map((row, ri) => {
          const rowTotal =
            row.values["0-7"] + row.values["8-14"] + row.values["15-30"] + row.values["30+"];
          const y = padT + ri * rowH + rowH * 0.15;
          const barH = rowH * 0.7;
          let x = padL;
          const color = row.color ?? FALLBACK_COLORS[ri % FALLBACK_COLORS.length]!;
          return (
            <g key={row.statoId}>
              <text
                x={padL - 8}
                y={y + barH / 2}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-[color:var(--cab-text-muted)]"
                style={{ fontSize: 10 }}
              >
                {row.label.length > 14 ? `${row.label.slice(0, 13)}…` : row.label}
              </text>
              {BUCKETS.map((b, bi) => {
                const v = row.values[b];
                const w = (v / maxTotal) * innerW;
                const rect = (
                  <rect
                    key={b}
                    x={x}
                    y={y}
                    width={Math.max(v > 0 ? 2 : 0, w)}
                    height={barH}
                    fill={row.color ?? FALLBACK_COLORS[(ri + bi) % FALLBACK_COLORS.length]}
                    opacity={1 - bi * 0.12}
                    rx={bi === 0 ? 2 : 0}
                  >
                    <title>{`${row.label} · ${agingBucketLabel(b)}: ${v}`}</title>
                  </rect>
                );
                x += w;
                return rect;
              })}
              <text
                x={padL + innerW + 6}
                y={y + barH / 2}
                dominantBaseline="middle"
                className="fill-[color:var(--cab-text)]"
                style={{ fontSize: 10, fontWeight: 600 }}
              >
                {rowTotal}
              </text>
            </g>
          );
        })}
        <g transform={`translate(${padL}, ${H - padB + 4})`}>
          {BUCKETS.map((b, i) => (
            <g key={b} transform={`translate(${i * 90}, 0)`}>
              <rect width={10} height={10} fill={FALLBACK_COLORS[i]} rx={1} />
              <text x={14} y={9} className="fill-[color:var(--cab-text-muted)]" style={{ fontSize: 9 }}>
                {agingBucketLabel(b)}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </ReportVisualization>
  );
}
