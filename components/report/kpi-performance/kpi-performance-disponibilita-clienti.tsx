"use client";

import { reportSectionGroupDescClass, reportSubsectionTitleClass } from "@/components/report/report-ui-tokens";
import { dsTableRow, dsTableTd, dsTableWrap, dsScrollbar } from "@/lib/ui/design-system";
import type { ClienteDisponibilitaRow } from "@/lib/report/kpi-performance/kpi-performance-formulas";

const SOGLIA_DISP_PCT = 75;

function fmtDisp(pct: number | null): string {
  if (pct == null) return "—";
  return `${pct.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
}

export function KpiPerformanceDisponibilitaClienti({
  rows,
}: {
  rows: readonly ClienteDisponibilitaRow[];
}) {
  return (
    <div className="min-w-0">
      <h3 className={reportSubsectionTitleClass}>Disponibilità per cliente</h3>
      <p className={`mt-1 ${reportSectionGroupDescClass}`}>
        Percentuale mezzi senza lavorazione aperta, calcolata per cliente sull&apos;anagrafica flotta.
      </p>
      <div className={`mt-3 ${dsTableWrap} ${dsScrollbar}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[color:var(--cab-border)] text-left text-xs text-[color:var(--cab-text-muted)]">
              <th className={`${dsTableTd} font-medium`}>Cliente</th>
              <th className={`${dsTableTd} w-16 text-right font-medium`}>Mezzi</th>
              <th className={`${dsTableTd} w-24 text-right font-medium`}>In officina</th>
              <th className={`${dsTableTd} w-20 text-right font-medium`}>Disp.</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className={dsTableRow}>
                <td colSpan={4} className={`${dsTableTd} text-[color:var(--cab-text-muted)]`}>
                  Nessun mezzo in anagrafica.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const dispLow = row.disponibilitaPct != null && row.disponibilitaPct < SOGLIA_DISP_PCT;
                return (
                  <tr key={row.cliente} className={dsTableRow}>
                    <td className={`${dsTableTd} max-w-[12rem] truncate font-medium text-[color:var(--cab-text)]`}>
                      {row.cliente}
                    </td>
                    <td className={`${dsTableTd} text-right tabular-nums text-[color:var(--cab-text)]`}>
                      {row.totalMezzi}
                    </td>
                    <td className={`${dsTableTd} text-right tabular-nums text-[color:var(--cab-text-muted)]`}>
                      {row.mezziInOfficina}
                    </td>
                    <td
                      className={`${dsTableTd} text-right tabular-nums font-semibold ${
                        dispLow
                          ? "text-[color:color-mix(in_srgb,var(--cab-warning)_88%,var(--cab-text))]"
                          : "text-[color:var(--cab-text)]"
                      }`}
                    >
                      {fmtDisp(row.disponibilitaPct)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
