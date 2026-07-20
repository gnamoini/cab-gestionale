"use client";

import { KpiPerformanceBarChart } from "@/components/report/kpi-performance/kpi-performance-bar-chart";
import { KpiPerformanceDisponibilitaClienti } from "@/components/report/kpi-performance/kpi-performance-disponibilita-clienti";
import { DisponibilitaClienteBarChart } from "@/components/report/primitives/chart/disponibilita-cliente-bar-chart";
import { GuastiTipoDonutChart } from "@/components/report/primitives/chart/guasti-tipo-donut-chart";
import { reportSectionGroupDescClass, reportSubsectionTitleClass } from "@/components/report/report-ui-tokens";
import { dsTableRow, dsTableTd, dsTableWrap, dsScrollbar } from "@/lib/ui/design-system";
import { buildDisponibilitaFasciaMatrix } from "@/lib/report/kpi-performance/fleet-report-helpers";
import type { KpiPerformanceFleet } from "@/lib/report/kpi-performance/kpi-performance-types";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return "—";
  return new Date(`${d}T12:00:00`).toLocaleDateString("it-IT");
}

export function KpiPerformanceFleet({
  data,
  clienteFilter = "",
}: {
  data: KpiPerformanceFleet;
  clienteFilter?: string;
}) {
  const dispRows = clienteFilter.trim()
    ? data.disponibilitaPerCliente.filter((r) =>
        r.cliente.toLowerCase().includes(clienteFilter.trim().toLowerCase()),
      )
    : data.disponibilitaPerCliente;
  const fascie = buildDisponibilitaFasciaMatrix(dispRows);

  return (
    <div className="grid min-w-0 gap-6">
      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <div className="min-w-0">
          <h3 className={reportSubsectionTitleClass}>Disponibilità per cliente</h3>
          <p className={`mt-1 ${reportSectionGroupDescClass}`}>
            Top 10 clienti con disponibilità più bassa (proxy su lav aperte).
          </p>
          <div className="mt-3">
            <DisponibilitaClienteBarChart rows={dispRows} />
          </div>
        </div>
        <div className="min-w-0">
          <h3 className={reportSubsectionTitleClass}>Guasti per tipo attrezzatura</h3>
          <p className={`mt-1 ${reportSectionGroupDescClass}`}>Euristica su testo interventi nel periodo.</p>
          <div className="mt-3">
            <GuastiTipoDonutChart items={data.guastiByTipo} />
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <div className="min-w-0">
          <h3 className={reportSubsectionTitleClass}>Trend guasti mensili</h3>
          <p className={`mt-1 ${reportSectionGroupDescClass}`}>Conteggio eventi euristici per mese.</p>
          <div className="mt-3">
            <KpiPerformanceBarChart
              points={data.heuristicFaultsMonthly}
              ariaLabel="Guasti euristici per mese"
              barClassName="fill-[color:var(--cab-danger)]"
            />
          </div>
        </div>
        <div className="min-w-0">
          <h3 className={reportSubsectionTitleClass}>Trend disponibilità flotta</h3>
          <p className={`mt-1 ${reportSectionGroupDescClass}`}>
            Proxy mensile: % mezzi operativi a fine mese.
          </p>
          <div className="mt-3">
            <KpiPerformanceBarChart
              points={data.disponibilitaTrendMonthly}
              ariaLabel="Trend disponibilità flotta"
              barClassName="fill-[color:color-mix(in_srgb,var(--cab-success)_75%,var(--cab-primary))]"
            />
          </div>
        </div>
      </div>

      <div id="report-cm-disponibilita-table">
        <KpiPerformanceDisponibilitaClienti rows={dispRows} />
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <div className="min-w-0">
          <h3 className={reportSubsectionTitleClass}>Matrice disponibilità</h3>
          <p className={`mt-1 ${reportSectionGroupDescClass}`}>Clienti per fascia % operativi.</p>
          <div className={`mt-3 ${dsTableWrap}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--cab-border)] text-left text-xs text-[color:var(--cab-text-muted)]">
                  <th className={`${dsTableTd} font-medium`}>Fascia</th>
                  <th className={`${dsTableTd} w-20 text-right font-medium`}>Clienti</th>
                </tr>
              </thead>
              <tbody>
                {fascie.map((f) => (
                  <tr key={f.fascia} className={dsTableRow}>
                    <td className={dsTableTd}>{f.fascia}</td>
                    <td className={`${dsTableTd} text-right tabular-nums`}>{f.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="min-w-0" id="report-cm-mezzi-guasti-alta">
          <h3 className={reportSubsectionTitleClass}>Mezzi frequenza guasti alta</h3>
          <p className={`mt-1 ${reportSectionGroupDescClass}`}>
            Tempo medio fermo nel periodo:{" "}
            {data.avgDowntimeDays != null
              ? `${data.avgDowntimeDays.toLocaleString("it-IT", { maximumFractionDigits: 1 })} gg`
              : "—"}
          </p>
          <div className={`mt-3 ${dsTableWrap} ${dsScrollbar}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--cab-border)] text-left text-xs text-[color:var(--cab-text-muted)]">
                  <th className={`${dsTableTd} font-medium`}>Mezzo</th>
                  <th className={`${dsTableTd} font-medium`}>Cliente</th>
                  <th className={`${dsTableTd} font-medium`}>Tipo</th>
                  <th className={`${dsTableTd} font-medium`}>Ultimo</th>
                </tr>
              </thead>
              <tbody>
                {data.mezziAltaFrequenzaGuasti.length === 0 ? (
                  <tr className={dsTableRow}>
                    <td colSpan={4} className={`${dsTableTd} text-[color:var(--cab-text-muted)]`}>
                      Nessun mezzo in soglia alta.
                    </td>
                  </tr>
                ) : (
                  data.mezziAltaFrequenzaGuasti.map((m) => (
                    <tr key={m.mezzoId} className={dsTableRow}>
                      <td className={dsTableTd}>{m.label}</td>
                      <td className={`${dsTableTd} max-w-[8rem] truncate`}>{m.cliente}</td>
                      <td className={`${dsTableTd} max-w-[8rem] truncate`}>{m.tipoAttrezzatura}</td>
                      <td className={`${dsTableTd} whitespace-nowrap text-xs tabular-nums`}>
                        {fmtDate(m.ultimoInterventoIso)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
