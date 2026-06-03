"use client";

import { reportSectionGroupDescClass, reportSubsectionTitleClass } from "@/components/report/report-ui-tokens";
import { dsTableRow, dsTableTd, dsTableWrap, dsScrollbar } from "@/lib/ui/design-system";
import type { KpiPerformanceFleet } from "@/lib/report/kpi-performance/kpi-performance-types";

export function KpiPerformanceFleet({ data }: { data: KpiPerformanceFleet }) {
  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-2">
      <div className="min-w-0">
        <h3 className={reportSubsectionTitleClass}>Guasti per tipo attrezzatura</h3>
        <p className={`mt-1 ${reportSectionGroupDescClass}`}>Euristica su testo interventi nel periodo.</p>
        <ul className="mt-3 space-y-2">
          {data.guastiByTipo.length === 0 ? (
            <li className="text-sm text-[color:var(--cab-text-muted)]">Nessun evento rilevato.</li>
          ) : (
            data.guastiByTipo.map((g) => (
              <li
                key={g.tipo}
                className="flex items-center justify-between gap-2 rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate text-[color:var(--cab-text)]">{g.tipo}</span>
                <span className="shrink-0 font-semibold tabular-nums text-[color:var(--cab-text)]">{g.count}</span>
              </li>
            ))
          )}
        </ul>
      </div>
      <div className="min-w-0">
        <h3 className={reportSubsectionTitleClass}>Mezzi frequenza guasti alta</h3>
        <p className={`mt-1 ${reportSectionGroupDescClass}`}>
          Tempo medio fermo nel periodo:{" "}
          {data.avgDowntimeDays != null
            ? `${data.avgDowntimeDays.toLocaleString("it-IT", { maximumFractionDigits: 1 })} gg`
            : "—"}
        </p>
        <div className={`mt-3 ${dsTableWrap} ${dsScrollbar}`}>
          <table className="w-full text-sm">
            <tbody>
              {data.mezziAltaFrequenzaGuasti.length === 0 ? (
                <tr className={dsTableRow}>
                  <td className={`${dsTableTd} text-[color:var(--cab-text-muted)]`}>Nessun mezzo in soglia alta.</td>
                </tr>
              ) : (
                data.mezziAltaFrequenzaGuasti.map((m) => (
                  <tr key={m.mezzoId} className={dsTableRow}>
                    <td className={dsTableTd}>{m.label}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
