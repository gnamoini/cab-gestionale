"use client";

import { ReportVisualization } from "@/components/report/design-system/layout/visualization";
import type { CloseTimeByPrioritaRow } from "@/lib/report/lavorazioni-work-orders";

import { reportChartSeriesColor } from "@/lib/report/ui/report-chart-theme";

export function ReportCloseTimePrioritaChart({
  rows,
  title = "Tempo chiusura per priorità",
}: {
  rows: readonly CloseTimeByPrioritaRow[];
  title?: string;
}) {
  if (rows.length === 0) {
    return (
      <ReportVisualization title={title}>
        <p className="text-sm text-[color:var(--cab-text-muted)]">Nessuna chiusura nel periodo.</p>
      </ReportVisualization>
    );
  }

  const W = 720;
  const H = 220;
  const padL = 48;
  const padR = 16;
  const padT = 12;
  const padB = 48;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const maxY = Math.max(1, ...rows.flatMap((r) => [r.median, r.p90]));
  const n = rows.length;
  const bw = innerW / n;
  const base = padT + innerH;

  return (
    <ReportVisualization title={title}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full max-w-full" role="img" aria-label={title}>
        <line x1={padL} y1={base} x2={W - padR} y2={base} stroke="currentColor" className="text-[color:var(--cab-border)]" />
        {rows.map((r, i) => {
          const cx = padL + bw * i + bw / 2;
          const hm = (r.median / maxY) * innerH;
          const hp = (r.p90 / maxY) * innerH;
          const w = Math.min(20, bw * 0.22);
          return (
            <g key={r.priorita}>
              <rect x={cx - w - 2} y={base - hm} width={w} height={hm} fill={reportChartSeriesColor("secondary")} rx={2}>
                <title>{`${r.label} mediana: ${r.median} gg (n=${r.count})`}</title>
              </rect>
              <rect x={cx + 2} y={base - hp} width={w} height={hp} fill={reportChartSeriesColor("accent")} rx={2}>
                <title>{`${r.label} P90: ${r.p90} gg`}</title>
              </rect>
              <text x={cx} y={H - 10} textAnchor="middle" className="fill-[color:var(--cab-text-muted)]" style={{ fontSize: 9 }}>
                {r.label}
              </text>
            </g>
          );
        })}
        <text x={padL} y={padT + 8} className="fill-[color:var(--cab-text-muted)]" style={{ fontSize: 9 }}>
          ■ mediana · ■ P90 (gg)
        </text>
      </svg>
    </ReportVisualization>
  );
}
