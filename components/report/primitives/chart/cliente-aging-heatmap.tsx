"use client";

import { ReportVisualization } from "@/components/report/design-system/layout/visualization";
import type { ClienteAgingHeatmapRow } from "@/lib/report/economic-analytics-extended";

const BUCKETS = ["0-30", "31-60", "61-90", "90+"] as const;
const BUCKET_LABELS: Record<(typeof BUCKETS)[number], string> = {
  "0-30": "0–30",
  "31-60": "31–60",
  "61-90": "61–90",
  "90+": "90+",
};

export function ReportClienteAgingHeatmap({
  rows,
  title = "Crediti per cliente e fascia",
}: {
  rows: readonly ClienteAgingHeatmapRow[];
  title?: string;
}) {
  if (rows.length === 0) {
    return (
      <ReportVisualization title={title}>
        <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun credito aperto.</p>
      </ReportVisualization>
    );
  }

  const maxCell = Math.max(
    1,
    ...rows.flatMap((r) => BUCKETS.map((b) => r.buckets[b])),
  );

  return (
    <ReportVisualization title={title}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-xs">
          <thead>
            <tr className="text-left text-[color:var(--cab-text-muted)]">
              <th className="pb-2 pr-2 font-semibold">Cliente</th>
              {BUCKETS.map((b) => (
                <th key={b} className="px-1 pb-2 text-right font-semibold">
                  {BUCKET_LABELS[b]} gg
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.cliente} className="border-t border-[color:var(--cab-border)]">
                <td className="max-w-[140px] truncate py-2 pr-2 font-medium">{row.cliente}</td>
                {BUCKETS.map((b) => {
                  const v = row.buckets[b];
                  const intensity = v > 0 ? 0.15 + (v / maxCell) * 0.75 : 0;
                  return (
                    <td key={b} className="px-1 py-2 text-right tabular-nums">
                      <span
                        className="inline-block min-w-[3rem] rounded px-1.5 py-0.5"
                        style={{
                          background: v > 0 ? `color-mix(in srgb, var(--cab-primary) ${Math.round(intensity * 100)}%, transparent)` : undefined,
                        }}
                      >
                        {v > 0
                          ? v.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
                          : "—"}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportVisualization>
  );
}
