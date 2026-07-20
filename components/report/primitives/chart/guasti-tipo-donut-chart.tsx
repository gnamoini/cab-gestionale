"use client";

import { memo } from "react";
import { reportChartShellClass } from "@/components/report/report-ui-tokens";

const PALETTE = [
  "var(--cab-primary)",
  "color-mix(in srgb, var(--cab-primary) 70%, var(--cab-success))",
  "var(--cab-success)",
  "color-mix(in srgb, var(--cab-warning) 80%, var(--cab-primary))",
  "var(--cab-warning)",
  "color-mix(in srgb, var(--cab-danger) 75%, var(--cab-warning))",
];

function GuastiTipoDonutChartInner({
  items,
  ariaLabel = "Guasti per tipo attrezzatura",
}: {
  items: readonly { tipo: string; count: number }[];
  ariaLabel?: string;
}) {
  const data = items.filter((i) => i.count > 0).slice(0, 8);
  const total = data.reduce((s, i) => s + i.count, 0);
  if (total <= 0) {
    return <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun evento rilevato.</p>;
  }

  const cx = 100;
  const cy = 100;
  const r = 72;
  const ir = 44;
  let angle = -Math.PI / 2;

  const slices = data.map((item, idx) => {
    const frac = item.count / total;
    const next = angle + frac * Math.PI * 2;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(next);
    const y2 = cy + r * Math.sin(next);
    const xi1 = cx + ir * Math.cos(next);
    const yi1 = cy + ir * Math.sin(next);
    const xi2 = cx + ir * Math.cos(angle);
    const yi2 = cy + ir * Math.sin(angle);
    const large = frac > 0.5 ? 1 : 0;
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi1} ${yi1} A ${ir} ${ir} 0 ${large} 0 ${xi2} ${yi2} Z`;
    angle = next;
    const color = PALETTE[idx % PALETTE.length]!;
    return { ...item, d, color, pct: Math.round(frac * 1000) / 10 };
  });

  return (
    <div className={`${reportChartShellClass} flex flex-col gap-3 sm:flex-row sm:items-center`}>
      <svg viewBox="0 0 200 200" className="mx-auto h-44 w-44 shrink-0" role="img" aria-label={ariaLabel}>
        {slices.map((s) => (
          <path key={s.tipo} d={s.d} fill={s.color} opacity={0.92}>
            <title>{`${s.tipo}: ${s.count} (${s.pct}%)`}</title>
          </path>
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-[color:var(--cab-text)] text-[14px] font-semibold">
          {total}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="fill-[color:var(--cab-text-muted)] text-[9px]">
          eventi
        </text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {slices.map((s) => (
          <li key={s.tipo} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
              <span className="truncate text-[color:var(--cab-text)]">{s.tipo}</span>
            </span>
            <span className="shrink-0 tabular-nums text-[color:var(--cab-text-muted)]">
              {s.count} · {s.pct}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const GuastiTipoDonutChart = memo(GuastiTipoDonutChartInner);
