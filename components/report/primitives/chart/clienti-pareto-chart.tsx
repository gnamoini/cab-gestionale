"use client";

import { memo } from "react";
import { reportChartShellClass } from "@/components/report/report-ui-tokens";
import type { ParetoClientePoint } from "@/lib/report/kpi-performance/fleet-report-helpers";

function ClientiParetoChartInner({
  points,
  ariaLabel = "Pareto clienti per interventi",
}: {
  points: readonly ParetoClientePoint[];
  ariaLabel?: string;
}) {
  if (points.length === 0) {
    return <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun intervento nel periodo.</p>;
  }

  const W = 640;
  const H = 220;
  const padL = 36;
  const padR = 36;
  const padT = 16;
  const padB = 52;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const maxY = Math.max(1, ...points.map((p) => p.interventi));
  const slot = innerW / points.length;
  const barW = Math.max(6, slot * 0.5);

  const linePts = points.map((p, i) => {
    const x = padL + i * slot + slot / 2;
    const y = padT + innerH - (p.cumulPct / 100) * innerH;
    return `${x},${y}`;
  });

  return (
    <div className={reportChartShellClass}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-52 w-full max-w-full" role="img" aria-label={ariaLabel}>
        <line x1={padL} y1={padT + innerH} x2={W - padR} y2={padT + innerH} className="stroke-[color:var(--cab-border)]" />
        {points.map((p, i) => {
          const h = (p.interventi / maxY) * innerH;
          const x = padL + i * slot + (slot - barW) / 2;
          const y = padT + innerH - h;
          return (
            <g key={p.cliente}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(0, h)}
                rx={2}
                className="fill-[color:color-mix(in_srgb,var(--cab-primary)_68%,transparent)]"
              >
                <title>{`${p.cliente}: ${p.interventi} interventi`}</title>
              </rect>
              <text
                x={x + barW / 2}
                y={H - 8}
                textAnchor="middle"
                className="fill-[color:var(--cab-text-muted)] text-[8px]"
              >
                {p.cliente.length > 8 ? `${p.cliente.slice(0, 7)}…` : p.cliente}
              </text>
            </g>
          );
        })}
        <polyline
          points={linePts.join(" ")}
          fill="none"
          strokeWidth={2}
          className="stroke-[color:color-mix(in_srgb,var(--cab-warning)_85%,var(--cab-text))]"
        />
        {points.map((p, i) => {
          const x = padL + i * slot + slot / 2;
          const y = padT + innerH - (p.cumulPct / 100) * innerH;
          return (
            <circle key={`${p.cliente}-dot`} cx={x} cy={y} r={3} className="fill-[color:var(--cab-warning)]">
              <title>{`Cumulata: ${p.cumulPct}%`}</title>
            </circle>
          );
        })}
        <line
          x1={padL}
          y1={padT + innerH * 0.2}
          x2={W - padR}
          y2={padT + innerH * 0.2}
          strokeDasharray="4 4"
          className="stroke-[color:color-mix(in_srgb,var(--cab-text-muted)_40%,transparent)]"
          strokeWidth={1}
        />
        <text x={W - padR} y={padT + innerH * 0.2 - 4} textAnchor="end" className="fill-[color:var(--cab-text-muted)] text-[8px]">
          80%
        </text>
      </svg>
      <p className="mt-1 text-[10px] text-[color:var(--cab-text-muted)]">
        Barre: interventi · Linea: cumulata %
      </p>
    </div>
  );
}

export const ClientiParetoChart = memo(ClientiParetoChartInner);
