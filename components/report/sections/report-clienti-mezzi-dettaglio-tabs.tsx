"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ReportTopClienti } from "@/components/report/report-tops";
import { reportSubsectionTitleClass } from "@/components/report/report-ui-tokens";
import { dsTableRow, dsTableTd, dsTableWrap, dsScrollbar } from "@/lib/ui/design-system";
import type { MtbfMttrRow, RecidivaMezzoRow } from "@/lib/report/lavorazioni-work-orders";
import type { MezzoAltaFrequenzaGuastiRow } from "@/lib/report/kpi-performance/kpi-performance-formulas";
import type { TopClienteReportRow, TopMezzoReportRow } from "@/lib/report/report-classifiche";

export type MezzoCriticoUnifiedRow = {
  mezzoId: string;
  mezzo: string;
  cliente: string;
  interventi: number;
  recidiva: boolean;
  guastiAlta: boolean;
  mtbf: number | null;
  mttr: number | null;
  ultimoIntervento: string | null;
};

function buildMezziCriticiRows(input: {
  topsMezzi: readonly TopMezzoReportRow[];
  recidiva: readonly RecidivaMezzoRow[];
  altaFrequenza: readonly MezzoAltaFrequenzaGuastiRow[];
  mtbf: readonly MtbfMttrRow[];
}): MezzoCriticoUnifiedRow[] {
  const byId = new Map<string, MezzoCriticoUnifiedRow>();

  for (const r of input.topsMezzi) {
    byId.set(r.id, {
      mezzoId: r.id,
      mezzo: r.mezzo,
      cliente: r.cliente,
      interventi: r.interventi,
      recidiva: false,
      guastiAlta: false,
      mtbf: null,
      mttr: null,
      ultimoIntervento: null,
    });
  }

  for (const r of input.recidiva) {
    const cur = byId.get(r.mezzoId) ?? {
      mezzoId: r.mezzoId,
      mezzo: r.mezzo,
      cliente: r.cliente,
      interventi: r.interventi,
      recidiva: false,
      guastiAlta: false,
      mtbf: null,
      mttr: null,
      ultimoIntervento: null,
    };
    cur.recidiva = true;
    cur.interventi = Math.max(cur.interventi, r.interventi);
    cur.ultimoIntervento = r.ultimoIntervento;
    byId.set(r.mezzoId, cur);
  }

  for (const r of input.altaFrequenza) {
    const cur = byId.get(r.mezzoId) ?? {
      mezzoId: r.mezzoId,
      mezzo: r.label,
      cliente: r.cliente,
      interventi: 0,
      recidiva: false,
      guastiAlta: false,
      mtbf: null,
      mttr: null,
      ultimoIntervento: r.ultimoInterventoIso,
    };
    cur.guastiAlta = true;
    cur.ultimoIntervento = cur.ultimoIntervento ?? r.ultimoInterventoIso?.slice(0, 10) ?? null;
    byId.set(r.mezzoId, cur);
  }

  for (const r of input.mtbf) {
    const cur = byId.get(r.mezzoId);
    if (!cur) continue;
    cur.mtbf = r.mtbf;
    cur.mttr = r.mttr;
  }

  return [...byId.values()]
    .filter((r) => r.recidiva || r.guastiAlta || r.interventi >= 3)
    .sort((a, b) => {
      const score = (x: MezzoCriticoUnifiedRow) =>
        (x.guastiAlta ? 4 : 0) + (x.recidiva ? 2 : 0) + Math.min(x.interventi, 10);
      return score(b) - score(a) || b.interventi - a.interventi;
    });
}

type TabId = "mezzi" | "clienti";

export function ReportClientiMezziDettaglioTabs({
  topsMezzi,
  topsClienti,
  recidiva,
  altaFrequenza,
  mtbf,
  showCompare,
  soloCritici,
}: {
  topsMezzi: readonly TopMezzoReportRow[];
  topsClienti: readonly TopClienteReportRow[];
  recidiva: readonly RecidivaMezzoRow[];
  altaFrequenza: readonly MezzoAltaFrequenzaGuastiRow[];
  mtbf: readonly MtbfMttrRow[];
  showCompare: boolean;
  soloCritici: boolean;
}) {
  const [tab, setTab] = useState<TabId>("mezzi");

  const criticiRows = useMemo(
    () =>
      buildMezziCriticiRows({
        topsMezzi,
        recidiva,
        altaFrequenza,
        mtbf,
      }),
    [topsMezzi, recidiva, altaFrequenza, mtbf],
  );

  const mezziDisplay = useMemo(() => {
    if (soloCritici) return criticiRows.filter((r) => r.recidiva || r.guastiAlta);
    return criticiRows.length > 0
      ? criticiRows
      : topsMezzi.map((r) => ({
          mezzoId: r.id,
          mezzo: r.mezzo,
          cliente: r.cliente,
          interventi: r.interventi,
          recidiva: false,
          guastiAlta: false,
          mtbf: null,
          mttr: null,
          ultimoIntervento: null,
        }));
  }, [soloCritici, criticiRows, topsMezzi]);

  const tabBtn = (id: TabId, label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`rounded-[var(--ds-radius-md)] px-3 py-1.5 text-xs font-medium transition-colors ${
        tab === id
          ? "bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-card))] text-[color:var(--cab-primary)]"
          : "text-[color:var(--cab-text-muted)] hover:text-[color:var(--cab-text)]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-w-0">
      <div className="mb-3 flex gap-1.5 flex-nowrap sm:flex-wrap" role="tablist">
        {tabBtn("mezzi", "Mezzi critici")}
        {tabBtn("clienti", "Clienti")}
      </div>

      {tab === "mezzi" ? (
        <div id="report-cm-mezzi-critici" role="tabpanel">
          <p className={`mb-2 ${reportSubsectionTitleClass}`}>Mezzi critici</p>
          <div className={`${dsTableWrap} ${dsScrollbar}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--cab-border)] text-left text-xs text-[color:var(--cab-text-muted)]">
                  <th className={`${dsTableTd} font-medium`}>Mezzo</th>
                  <th className={`${dsTableTd} font-medium`}>Cliente</th>
                  <th className={`${dsTableTd} w-16 text-right font-medium`}>Lav.</th>
                  <th className={`${dsTableTd} w-20 text-right font-medium`}>MTTR</th>
                  <th className={`${dsTableTd} w-20 text-right font-medium`}>MTBF</th>
                  <th className={`${dsTableTd} font-medium`}>Segnali</th>
                </tr>
              </thead>
              <tbody>
                {mezziDisplay.length === 0 ? (
                  <tr className={dsTableRow}>
                    <td colSpan={6} className={`${dsTableTd} text-[color:var(--cab-text-muted)]`}>
                      Nessun mezzo critico nel periodo.
                    </td>
                  </tr>
                ) : (
                  mezziDisplay.map((r) => (
                    <tr key={r.mezzoId} className={dsTableRow}>
                      <td className={dsTableTd}>
                        <Link href="/mezzi" className="font-medium text-[color:var(--cab-primary)] hover:underline">
                          {r.mezzo}
                        </Link>
                      </td>
                      <td className={`${dsTableTd} max-w-[10rem] truncate`}>{r.cliente}</td>
                      <td className={`${dsTableTd} text-right tabular-nums`}>{r.interventi}</td>
                      <td className={`${dsTableTd} text-right tabular-nums`}>
                        {r.mttr != null ? r.mttr : "—"}
                      </td>
                      <td className={`${dsTableTd} text-right tabular-nums`}>
                        {r.mtbf != null ? r.mtbf : "—"}
                      </td>
                      <td className={`${dsTableTd} text-xs text-[color:var(--cab-text-muted)]`}>
                        {[r.guastiAlta ? "Guasti alta" : null, r.recidiva ? "Recidiva" : null]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div id="report-cm-classifiche-clienti" role="tabpanel">
          <ReportTopClienti rows={[...topsClienti]} showCompare={showCompare} showPctTotale />
        </div>
      )}
    </div>
  );
}
