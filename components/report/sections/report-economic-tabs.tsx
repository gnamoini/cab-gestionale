"use client";

import { useState } from "react";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import { reportSubsectionTitleClass } from "@/components/report/report-ui-tokens";
import { dsTableRow, dsTableTd, dsTableWrap, dsScrollbar } from "@/lib/ui/design-system";
import type { InvoiceRow } from "@/src/types/supabase-tables";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import type { ScadutoClienteRow } from "@/lib/report/economic-analytics-extended";
import type { PreventivoConsuntivoRow } from "@/lib/report/economic-analytics-extended";

export type EconomicTabId = "fatture" | "crediti" | "preventivi";

const TABS: { id: EconomicTabId; label: string }[] = [
  { id: "fatture", label: "Fatture" },
  { id: "crediti", label: "Crediti" },
  { id: "preventivi", label: "Preventivi" },
];

function fmtEur(n: number): string {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

export function ReportEconomicTabs({
  activeTab,
  onTabChange,
  invoices,
  scaduti,
  preventivi,
  consuntivo,
}: {
  activeTab?: EconomicTabId;
  onTabChange?: (tab: EconomicTabId) => void;
  invoices: readonly InvoiceRow[];
  scaduti: readonly ScadutoClienteRow[];
  preventivi: readonly PreventivoRecord[];
  consuntivo: readonly PreventivoConsuntivoRow[];
}) {
  const [internalTab, setInternalTab] = useState<EconomicTabId>("fatture");
  const tab = activeTab ?? internalTab;
  const setTab = onTabChange ?? setInternalTab;

  const openInvoices = invoices.filter((inv) => inv.residuo > 0 && inv.status !== "annullata").slice(0, 15);

  return (
    <div className="min-w-0">
      <div className="mb-3 flex gap-2 flex-nowrap sm:flex-wrap" role="tablist" aria-label="Dettaglio economico">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === t.id
                ? "bg-[var(--cab-primary)] text-white"
                : "border border-[color:var(--cab-border)] bg-[var(--cab-card)] text-[color:var(--cab-text-muted)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "fatture" ? (
        <div className={`${dsTableWrap} ${dsScrollbar}`}>
          <table className="w-full min-w-[420px] text-sm">
            <GlobalTableHead>
              <GlobalTableHeadLabel label="Cliente" />
              <GlobalTableHeadLabel label="Emissione" />
              <GlobalTableHeadLabel label="Totale" align="right" />
              <GlobalTableHeadLabel label="Residuo" align="right" />
            </GlobalTableHead>
            <tbody>
              {invoices.slice(0, 15).map((inv) => (
                <tr key={inv.id} className={dsTableRow}>
                  <td className={`${dsTableTd} max-w-0 truncate`}>{inv.cliente_label}</td>
                  <td className={dsTableTd}>{inv.data_emissione}</td>
                  <td className={`${dsTableTd} text-right tabular-nums`}>{fmtEur(inv.totale)}</td>
                  <td className={`${dsTableTd} text-right tabular-nums`}>{fmtEur(inv.residuo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "crediti" ? (
        <div className="space-y-4">
          <div>
            <h3 className={reportSubsectionTitleClass}>Crediti aperti</h3>
            <div className={`mt-2 ${dsTableWrap} ${dsScrollbar}`}>
              <table className="w-full min-w-[360px] text-sm">
                <GlobalTableHead>
                  <GlobalTableHeadLabel label="Cliente" />
                  <GlobalTableHeadLabel label="Scadenza" />
                  <GlobalTableHeadLabel label="Residuo" align="right" />
                </GlobalTableHead>
                <tbody>
                  {openInvoices.length === 0 ? (
                    <tr className={dsTableRow}>
                      <td colSpan={3} className={`${dsTableTd} text-[color:var(--cab-text-muted)]`}>
                        Nessun credito aperto.
                      </td>
                    </tr>
                  ) : (
                    openInvoices.map((inv) => (
                      <tr key={inv.id} className={dsTableRow}>
                        <td className={`${dsTableTd} max-w-0 truncate`}>{inv.cliente_label}</td>
                        <td className={dsTableTd}>{inv.data_scadenza ?? "—"}</td>
                        <td className={`${dsTableTd} text-right tabular-nums font-medium`}>
                          {fmtEur(inv.residuo)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className={reportSubsectionTitleClass}>Scaduti per cliente</h3>
            <div className={`mt-2 ${dsTableWrap} ${dsScrollbar}`}>
              <table className="w-full min-w-[280px] text-sm">
                <GlobalTableHead>
                  <GlobalTableHeadLabel label="Cliente" />
                  <GlobalTableHeadLabel label="Fatture" align="right" />
                  <GlobalTableHeadLabel label="Importo" align="right" />
                </GlobalTableHead>
                <tbody>
                  {scaduti.length === 0 ? (
                    <tr className={dsTableRow}>
                      <td colSpan={3} className={`${dsTableTd} text-[color:var(--cab-text-muted)]`}>
                        Nessuna fattura scaduta.
                      </td>
                    </tr>
                  ) : (
                    scaduti.map((r) => (
                      <tr key={r.cliente} className={dsTableRow}>
                        <td className={`${dsTableTd} max-w-0 truncate`}>{r.cliente}</td>
                        <td className={`${dsTableTd} text-right tabular-nums`}>{r.count}</td>
                        <td className={`${dsTableTd} text-right tabular-nums font-medium`}>{fmtEur(r.importo)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "preventivi" ? (
        <div className="space-y-4">
          <div className={`${dsTableWrap} ${dsScrollbar}`}>
            <table className="w-full min-w-[360px] text-sm">
              <GlobalTableHead>
                <GlobalTableHeadLabel label="Numero" />
                <GlobalTableHeadLabel label="Stato" />
                <GlobalTableHeadLabel label="Totale" align="right" />
              </GlobalTableHead>
              <tbody>
                {preventivi.slice(0, 15).map((p) => (
                  <tr key={p.id} className={dsTableRow}>
                    <td className={dsTableTd}>{p.numero}</td>
                    <td className={dsTableTd}>{p.stato}</td>
                    <td className={`${dsTableTd} text-right tabular-nums`}>{fmtEur(p.totaleFinale ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {consuntivo.length > 0 ? (
            <div>
              <h3 className={reportSubsectionTitleClass}>Preventivo vs consuntivo</h3>
              <div className={`mt-2 ${dsTableWrap} ${dsScrollbar}`}>
                <table className="w-full min-w-[420px] text-sm">
                  <GlobalTableHead>
                    <GlobalTableHeadLabel label="Preventivo" />
                    <GlobalTableHeadLabel label="Stima" align="right" />
                    <GlobalTableHeadLabel label="Consuntivo" align="right" />
                    <GlobalTableHeadLabel label="Delta" align="right" />
                  </GlobalTableHead>
                  <tbody>
                    {consuntivo.map((r) => (
                      <tr key={r.preventivoId} className={dsTableRow}>
                        <td className={dsTableTd}>{r.label}</td>
                        <td className={`${dsTableTd} text-right tabular-nums`}>{fmtEur(r.preventivo)}</td>
                        <td className={`${dsTableTd} text-right tabular-nums`}>{fmtEur(r.consuntivo)}</td>
                        <td
                          className={`${dsTableTd} text-right tabular-nums font-medium ${
                            r.delta > 0 ? "text-[color:var(--cab-danger)]" : "text-[color:var(--cab-success)]"
                          }`}
                        >
                          {r.deltaPct != null ? `${r.deltaPct > 0 ? "+" : ""}${r.deltaPct}%` : fmtEur(r.delta)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
