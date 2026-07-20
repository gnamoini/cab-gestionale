"use client";

import type { CrossScatterPoint } from "@/lib/report/cross-analysis/build-cross-breakdowns";
import { ReportVisualization } from "@/components/report/design-system/layout/visualization";

export function CrossScatterChart({ points }: { points: readonly CrossScatterPoint[] }) {
  if (points.length === 0) {
    return (
      <ReportVisualization title="Ore vs ricambi per intervento">
        <p className="text-sm text-[color:var(--cab-text-muted)]">
          Nessun intervento con schede nel periodo.
        </p>
      </ReportVisualization>
    );
  }

  const W = 480;
  const H = 280;
  const pad = 40;
  const maxOre = Math.max(...points.map((p) => p.ore), 1);
  const maxRic = Math.max(...points.map((p) => p.ricambiQty), 1);

  return (
    <ReportVisualization title="Ore vs ricambi per intervento">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-64 w-full max-w-full" role="img" aria-label="Scatter ore ricambi">
        <line
          x1={pad}
          y1={H - pad}
          x2={W - pad}
          y2={H - pad}
          stroke="currentColor"
          className="text-[color:var(--cab-border)]"
        />
        <line
          x1={pad}
          y1={pad}
          x2={pad}
          y2={H - pad}
          stroke="currentColor"
          className="text-[color:var(--cab-border)]"
        />
        <text x={W / 2} y={H - 8} textAnchor="middle" className="fill-[color:var(--cab-text-muted)]" style={{ fontSize: 11 }}>
          Ore
        </text>
        <text
          x={12}
          y={H / 2}
          textAnchor="middle"
          transform={`rotate(-90 12 ${H / 2})`}
          className="fill-[color:var(--cab-text-muted)]"
          style={{ fontSize: 11 }}
        >
          Ricambi
        </text>
        {points.map((p) => {
          const cx = pad + (p.ore / maxOre) * (W - pad * 2);
          const cy = H - pad - (p.ricambiQty / maxRic) * (H - pad * 2);
          return (
            <circle
              key={p.id}
              cx={cx}
              cy={cy}
              r={p.outlier ? 6 : 4}
              fill={p.outlier ? "var(--cab-danger)" : "var(--cab-accent)"}
              opacity={0.85}
            >
              <title>{`${p.label}: ${p.ore} h, ${p.ricambiQty} ricambi`}</title>
            </circle>
          );
        })}
      </svg>
      <p className="mt-2 text-xs text-[color:var(--cab-text-muted)]">
        Punti rossi: outlier (z-score &gt; 2 su ore o ricambi).
      </p>
    </ReportVisualization>
  );
}
