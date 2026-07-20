"use client";

import { memo, useMemo } from "react";
import type { MagazzinoCategoryStockSlice } from "@/lib/report/magazzino-analytics";

const PALETTE = ["#0ea5e9", "#22c55e", "#f97316", "#a855f7", "#eab308", "#64748b", "#ec4899", "#14b8a6"];

function MagazzinoCategoryDonutChartInner({ slices }: { slices: MagazzinoCategoryStockSlice[] }) {
  const top = useMemo(() => slices.slice(0, 8), [slices]);
  const W = 280;
  const H = 280;
  const cx = W / 2;
  const cy = H / 2;
  const r = 90;
  const ir = 55;

  if (top.length === 0) {
    return <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun dato di stock per categoria.</p>;
  }

  let angle = -Math.PI / 2;
  const arcs = top.map((s, i) => {
    const sweep = (s.pct / 100) * Math.PI * 2;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(angle + sweep);
    const y2 = cy + r * Math.sin(angle + sweep);
    const ix1 = cx + ir * Math.cos(angle + sweep);
    const iy1 = cy + ir * Math.sin(angle + sweep);
    const ix2 = cx + ir * Math.cos(angle);
    const iy2 = cy + ir * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${ir} ${ir} 0 ${large} 0 ${ix2} ${iy2} Z`;
    angle += sweep;
    return { d, fill: PALETTE[i % PALETTE.length]!, s };
  });

  return (
    <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center">
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-56 w-56 shrink-0" role="img" aria-label="Stock per categoria">
        {arcs.map((a) => (
          <path key={a.s.categoria} d={a.d} fill={a.fill}>
            <title>{`${a.s.categoria}: ${a.s.pct}%`}</title>
          </path>
        ))}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1 text-xs">
        {top.map((s, i) => (
          <li key={s.categoria} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="truncate">{s.categoria}</span>
            </span>
            <span className="shrink-0 tabular-nums text-[color:var(--cab-text-muted)]">{s.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const MagazzinoCategoryDonutChart = memo(MagazzinoCategoryDonutChartInner);
