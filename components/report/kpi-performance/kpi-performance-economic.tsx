"use client";

import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import { reportSubsectionTitleClass } from "@/components/report/report-ui-tokens";
import { dsTableRow, dsTableTd, dsTableWrap, dsScrollbar } from "@/lib/ui/design-system";
import type { KpiPerformanceEconomic } from "@/lib/report/kpi-performance/kpi-performance-types";

function fmtEur(n: number): string {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

export function KpiPerformanceEconomic({ data }: { data: KpiPerformanceEconomic }) {
  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-2">
      <div className="min-w-0">
        <h3 className={reportSubsectionTitleClass}>Top mezzi per costo</h3>
        <p className="mt-1 text-[11px] text-[color:var(--cab-text-muted)]">
          Stima da schede lavorazione nel periodo
          {!data.manodoperaAvailable ? " (schede non disponibili o senza ore)" : ""}.
        </p>
        <div className={`mt-3 ${dsTableWrap} ${dsScrollbar}`}>
          <table className="w-full min-w-[280px] text-sm">
            <GlobalTableHead>
              <GlobalTableHeadLabel label="Mezzo" />
              <GlobalTableHeadLabel label="Costo stim." align="right" />
            </GlobalTableHead>
            <tbody>
              {data.topMezziByCost.length === 0 ? (
                <tr className={dsTableRow}>
                  <td colSpan={2} className={`${dsTableTd} text-[color:var(--cab-text-muted)]`}>
                    Nessun costo da schede nel periodo.
                  </td>
                </tr>
              ) : (
                data.topMezziByCost.map((r) => (
                  <tr key={r.mezzoId} className={dsTableRow}>
                    <td className={`${dsTableTd} max-w-0 truncate`} title={r.label}>
                      {r.label}
                    </td>
                    <td className={`${dsTableTd} text-right tabular-nums font-medium`}>{fmtEur(r.cost)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="min-w-0">
        <h3 className={reportSubsectionTitleClass}>Componenti più sostituiti</h3>
        <div className={`mt-3 ${dsTableWrap} ${dsScrollbar}`}>
          <table className="w-full min-w-[280px] text-sm">
            <GlobalTableHead>
              <GlobalTableHeadLabel label="Ricambio" />
              <GlobalTableHeadLabel label="Uscite" align="right" />
            </GlobalTableHead>
            <tbody>
              {data.topComponents.length === 0 ? (
                <tr className={dsTableRow}>
                  <td colSpan={2} className={`${dsTableTd} text-[color:var(--cab-text-muted)]`}>
                    Nessun movimento in uscita nel periodo.
                  </td>
                </tr>
              ) : (
                data.topComponents.map((r) => (
                  <tr key={r.id} className={dsTableRow}>
                    <td className={`${dsTableTd} max-w-0 truncate`} title={r.nome}>
                      {r.nome}
                    </td>
                    <td className={`${dsTableTd} text-right tabular-nums`}>{r.totalUscite}</td>
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
