"use client";

import { memo } from "react";
import { reportChartShellClass } from "@/components/report/report-ui-tokens";
import type { ClienteDisponibilitaRow } from "@/lib/report/kpi-performance/kpi-performance-formulas";
import { FLEET_DISP_SOGLIA_PCT } from "@/lib/report/kpi-performance/fleet-report-helpers";

function DisponibilitaClienteBarChartInner({
  rows,
  limit = 10,
  ariaLabel = "Disponibilità per cliente",
}: {
  rows: readonly ClienteDisponibilitaRow[];
  limit?: number;
  ariaLabel?: string;
}) {
  const data = [...rows]
    .filter((r) => r.disponibilitaPct != null)
    .sort((a, b) => (a.disponibilitaPct ?? 0) - (b.disponibilitaPct ?? 0))
    .slice(0, limit);

  if (data.length === 0) {
    return <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun dato disponibilità.</p>;
  }

  const W = 640;
  const rowH = 28;
  const padL = 120;
  const padR = 48;
  const padT = 8;
  const padB = 8;
  const H = padT + padB + data.length * rowH;
  const innerW = W - padL - padR;

  return (
    <div className={reportChartShellClass}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-full" role="img" aria-label={ariaLabel}>
        {data.map((row, i) => {
          const pct = row.disponibilitaPct ?? 0;
          const barW = (pct / 100) * innerW;
          const y = padT + i * rowH + 4;
          const low = pct < FLEET_DISP_SOGLIA_PCT;
          return (
            <g key={row.cliente}>
              <text
                x={padL - 8}
                y={y + 14}
                textAnchor="end"
                className="fill-[color:var(--cab-text-muted)] text-[9px]"
              >
                {row.cliente.length > 16 ? `${row.cliente.slice(0, 15)}…` : row.cliente}
                <title>{row.cliente}</title>
              </text>
              <rect
                x={padL}
                y={y}
                width={innerW}
                height={18}
                rx={3}
                className="fill-[color:color-mix(in_srgb,var(--cab-surface-2)_65%,var(--cab-card))]"
              />
              <rect
                x={padL}
                y={y}
                width={Math.max(2, barW)}
                height={18}
                rx={3}
                className={
                  low
                    ? "fill-[color:color-mix(in_srgb,var(--cab-warning)_78%,transparent)]"
                    : "fill-[color:color-mix(in_srgb,var(--cab-primary)_72%,transparent)]"
                }
              >
                <title>{`${row.cliente}: ${pct}%`}</title>
              </rect>
              <text
                x={padL + innerW + 6}
                y={y + 13}
                className={`text-[9px] tabular-nums ${low ? "fill-[color:var(--cab-warning)]" : "fill-[color:var(--cab-text)]"}`}
              >
                {pct.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%
              </text>
            </g>
          );
        })}
        <line
          x1={padL + (FLEET_DISP_SOGLIA_PCT / 100) * innerW}
          y1={padT}
          x2={padL + (FLEET_DISP_SOGLIA_PCT / 100) * innerW}
          y2={H - padB}
          strokeDasharray="3 3"
          className="stroke-[color:color-mix(in_srgb,var(--cab-warning)_55%,transparent)]"
          strokeWidth={1}
        />
      </svg>
      <p className="mt-1 text-[10px] text-[color:var(--cab-text-muted)]">Linea tratteggiata: soglia {FLEET_DISP_SOGLIA_PCT}%</p>
    </div>
  );
}

export const DisponibilitaClienteBarChart = memo(DisponibilitaClienteBarChartInner);
