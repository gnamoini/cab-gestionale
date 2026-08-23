"use client";

import { memo } from "react";
import type { MagazzinoParetoRow } from "@/lib/report/magazzino-analytics";

import { reportChartSeriesColor } from "@/lib/report/ui/report-chart-theme";

const SKY = reportChartSeriesColor("secondary");
const ORANGE = "var(--cab-primary)";

function MagazzinoParetoChartInner({ rows }: { rows: MagazzinoParetoRow[] }) {
  const W = 720;
  const H = 240;
  const padL = 44;
  const padR = 44;
  const padT = 16;
  const padB = 56;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = Math.max(rows.length, 1);
  const maxY = Math.max(1, ...rows.map((r) => r.uscite));
  const bw = innerW / n;
  const w = Math.min(24, bw * 0.6);
  const base = padT + innerH;

  if (rows.length === 0) {
    return <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun consumo nel periodo.</p>;
  }

  const linePts = rows.map((r, i) => {
    const px = padL + bw * i + bw / 2;
    const py = padT + innerH - (r.cumPct / 100) * innerH;
    return `${i === 0 ? "M" : "L"}${px},${py}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-60 w-full max-w-full" role="img" aria-label="Pareto consumi ricambi">
      <line x1={padL} y1={base} x2={W - padR} y2={base} stroke="currentColor" className="text-[color:var(--cab-border)]" />
      {rows.map((r, i) => {
        const cx = padL + bw * i + bw / 2;
        const h = (r.uscite / maxY) * innerH;
        return (
          <rect key={r.codice} x={cx - w / 2} y={base - h} width={w} height={h} fill={SKY} rx={2}>
            <title>{`${r.codice}: ${r.uscite} uscite (${r.cumPct}% cum.)`}</title>
          </rect>
        );
      })}
      <path d={linePts} fill="none" stroke={ORANGE} strokeWidth={2} />
      {rows.map((r, i) => {
        const px = padL + bw * i + bw / 2;
        const py = padT + innerH - (r.cumPct / 100) * innerH;
        return <circle key={`${r.codice}-dot`} cx={px} cy={py} r={3} fill={ORANGE} />;
      })}
    </svg>
  );
}

export const MagazzinoParetoChart = memo(MagazzinoParetoChartInner);
