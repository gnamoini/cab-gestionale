"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { ShellCard } from "@/components/gestionale/shell-card";
import { GlobalSelect } from "@/components/gestionale/global-input";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { ReportCompareBanner } from "@/components/report/report-compare-banner";
import { MagazzinoCapitalLineChart, MagazzinoEntrateUsciteBars } from "@/components/report/report-charts";
import { reportChartShellClass } from "@/components/report/report-ui-tokens";
import { erpBtnAccent, erpBtnNeutral } from "@/components/report/report-buttons";
import { GlobalTableHead } from "@/components/gestionale/global-table";
import { cycleReportSort, ReportSortTh, type ReportSortPhase } from "@/components/report/report-sort-th";
import type { ReportCompareDetail } from "@/lib/report/build-report-model";
import { deltaPct } from "@/lib/report/date-ranges";
import type { DateRange } from "@/lib/report/date-ranges";
import type { MagazzinoMonthRow } from "@/lib/report/magazzino-monthly-rows";
import { magazzinoLogTouchesRange } from "@/lib/report/magazzino-monthly-rows";
import {
  loadMagazzinoManualMonthMap,
  saveMagazzinoManualMonthMap,
  type MagazzinoManualMonthMap,
} from "@/lib/report/magazzino-manual-storage";
import {
  migrateMagazzinoManualLocalToDb,
  saveMagazzinoManualToDb,
} from "@/lib/report/magazzino-manual-db-sync";
import type { ReportDerivedBundle } from "@/lib/report/report-derived-cache";
import { getMagazzinoMonthlyRowsForRange } from "@/lib/report/report-derived-cache";
import {
  dsInput,
  dsTableRow,
  dsTableTd,
  dsTableWrap,
  dsScrollbar,
  dsTypoSmall,
} from "@/lib/ui/design-system";
import { globalInputFieldFilter } from "@/lib/ui/global-input";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";

function fmtPct(p: number | null): string {
  if (p == null) return "—";
  const s = p > 0 ? "+" : "";
  return `${s}${p.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
}

type MagSortKey = "mese" | "entrate" | "uscite" | "deltaQty" | "deltaCapitale" | "capitaleFinale";

function magCell(r: MagazzinoMonthRow, k: MagSortKey): string | number {
  switch (k) {
    case "mese":
      return r.key;
    case "entrate":
      return r.entrate;
    case "uscite":
      return r.uscite;
    case "deltaQty":
      return r.deltaQty;
    case "deltaCapitale":
      return r.deltaCapitale;
    case "capitaleFinale":
      return r.capitaleFinale;
    default:
      return 0;
  }
}

export function ReportMagazzinoSection({
  derivedBundle,
  prodotti,
  anchor,
  range,
  compareDetail,
  histRev,
  onHistRev,
}: {
  derivedBundle: ReportDerivedBundle;
  prodotti: RicambioMagazzino[];
  anchor: Date;
  range: DateRange;
  compareDetail: ReportCompareDetail | null;
  histRev: number;
  onHistRev: () => void;
}) {
  const magLogSorted = derivedBundle.magLogSorted;
  const [manualMap, setManualMap] = useState<MagazzinoManualMonthMap>(() => loadMagazzinoManualMonthMap());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const local = loadMagazzinoManualMonthMap();
      const merged = await migrateMagazzinoManualLocalToDb(local);
      if (!cancelled) setManualMap(merged);
    })();
    return () => {
      cancelled = true;
    };
  }, [histRev]);

  const manual = manualMap;
  const { rows, hasRawLog, note } = useMemo(
    () => getMagazzinoMonthlyRowsForRange(derivedBundle, prodotti, range, anchor, manual),
    [derivedBundle, prodotti, range, anchor, manual],
  );

  const logInRange = useMemo(() => magazzinoLogTouchesRange(magLogSorted, range), [magLogSorted, range]);
  const hasManualInRange = useMemo(() => {
    for (const r of rows) {
      const p = manual[r.key];
      if (p && Object.keys(p).length > 0) return true;
    }
    return false;
  }, [rows, manual]);

  const showEmpty = rows.length === 0 || (!logInRange && !hasRawLog && !hasManualInRange);

  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(rows[0]?.key ?? "");
  const [ent, setEnt] = useState("");
  const [usc, setUsc] = useState("");
  const [dQty, setDQty] = useState("");
  const [dCap, setDCap] = useState("");
  const [cFin, setCFin] = useState("");

  const [sortColumn, setSortColumn] = useState<MagSortKey | null>(null);
  const [sortPhase, setSortPhase] = useState<ReportSortPhase>("natural");

  const onSortMag = useCallback(
    (k: MagSortKey) => {
      const n = cycleReportSort(sortColumn, sortPhase, k);
      setSortColumn(n.column as MagSortKey | null);
      setSortPhase(n.phase);
    },
    [sortColumn, sortPhase],
  );

  const orderIndex = useMemo(() => new Map(rows.map((r, i) => [r.key, i])), [rows]);

  const sortedRows = useMemo(() => {
    if (sortPhase === "natural" || sortColumn == null) return rows;
    const c = [...rows];
    c.sort((a, b) => {
      const va = magCell(a, sortColumn);
      const vb = magCell(b, sortColumn);
      const m =
        typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "it");
      const p = sortPhase === "asc" ? m : -m;
      if (p !== 0) return p;
      return (orderIndex.get(a.key) ?? 0) - (orderIndex.get(b.key) ?? 0);
    });
    return c;
  }, [rows, sortColumn, sortPhase, orderIndex]);

  function openModal() {
    const k = rows[0]?.key ?? "";
    setKey(k);
    const p = manual[k] ?? {};
    setEnt(p.entrate != null ? String(p.entrate) : "");
    setUsc(p.uscite != null ? String(p.uscite) : "");
    setDQty(p.deltaQty != null ? String(p.deltaQty) : "");
    setDCap(p.deltaCapitale != null ? String(p.deltaCapitale) : "");
    setCFin(p.capitaleFinale != null ? String(p.capitaleFinale) : "");
    setOpen(true);
  }

  function saveManual() {
    if (!key) return;
    const next: MagazzinoManualMonthMap = { ...manual };
    const patch = { ...(next[key] ?? {}) };
    if (ent.trim()) patch.entrate = Number(ent);
    else delete patch.entrate;
    if (usc.trim()) patch.uscite = Number(usc);
    else delete patch.uscite;
    if (dQty.trim()) patch.deltaQty = Number(dQty);
    else delete patch.deltaQty;
    if (dCap.trim()) patch.deltaCapitale = Number(dCap);
    else delete patch.deltaCapitale;
    if (cFin.trim()) patch.capitaleFinale = Number(cFin);
    else delete patch.capitaleFinale;
    if (Object.keys(patch).length === 0) delete next[key];
    else next[key] = patch;
    saveMagazzinoManualMonthMap(next);
    void saveMagazzinoManualToDb(next);
    setManualMap(next);
    onHistRev();
    setOpen(false);
  }

  const dAbsCap = compareDetail
    ? compareDetail.magDeltaCapCur - compareDetail.magDeltaCapPrev
    : 0;
  const cmpMag =
    compareDetail != null ? (
      <ReportCompareBanner>
        <span className="font-semibold">Confronto periodo (magazzino)</span>
        {" · "}
        Somma Δ capitale: {compareDetail.magDeltaCapCur.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}{" "}
        vs {compareDetail.magDeltaCapPrev.toLocaleString("it-IT", { style: "currency", currency: "EUR" })} (
        {fmtPct(deltaPct(compareDetail.magDeltaCapCur, compareDetail.magDeltaCapPrev))}
        {dAbsCap !== 0 ? (
          <span className="tabular-nums">
            {" "}
            · Δ {dAbsCap > 0 ? "+" : ""}
            {dAbsCap.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
          </span>
        ) : null}
        )
      </ReportCompareBanner>
    ) : null;

  return (
    <ShellCard
      id="report-magazzino"
      title="Magazzino / ricambi"
      collapsible
      defaultCollapsed={false}
      headerActions={
        <button type="button" onClick={openModal} className={`${erpBtnNeutral} shrink-0 sm:text-sm`}>
          Gestisci storico magazzino
        </button>
      }
    >
      {cmpMag}
      {note ? (
        <ReportCompareBanner>
          <p className="text-xs leading-relaxed">{note}</p>
        </ReportCompareBanner>
      ) : null}

      {showEmpty ? (
        <p className="mb-4 rounded-lg border border-dashed border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_40%,var(--cab-card))] p-3 text-sm text-[color:var(--cab-text-muted)]">
          Nessun dato disponibile: nessun movimento di magazzino nel periodo selezionato. Puoi inserire dati manuali per
          ricostruire mesi mancanti.
        </p>
      ) : null}

      <div className={`${dsTableWrap} ${dsScrollbar} min-w-0`}>
        <table className="w-full min-w-0 table-fixed border-separate border-spacing-0 text-sm text-[color:var(--cab-text)]">
          <colgroup>
            <col style={{ width: "22%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "19%" }} />
            <col style={{ width: "19%" }} />
          </colgroup>
          <GlobalTableHead sticky>
              <ReportSortTh label="Mese" columnKey="mese" sortColumn={sortColumn} sortPhase={sortPhase} onSort={onSortMag} />
              <ReportSortTh
                label="Entrate"
                columnKey="entrate"
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSortMag}
                align="right"
              />
              <ReportSortTh
                label="Uscite"
                columnKey="uscite"
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSortMag}
                align="right"
              />
              <ReportSortTh
                label="Δ Q.tà"
                columnKey="deltaQty"
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSortMag}
                align="right"
              />
              <ReportSortTh
                label="Δ Capitale"
                columnKey="deltaCapitale"
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSortMag}
                align="right"
              />
              <ReportSortTh
                label="Cap. finale"
                columnKey="capitaleFinale"
                sortColumn={sortColumn}
                sortPhase={sortPhase}
                onSort={onSortMag}
                align="right"
              />
          </GlobalTableHead>
          <tbody>
            {sortedRows.map((r) => (
              <tr key={r.key} className={dsTableRow}>
                <td className={`${dsTableTd} font-medium whitespace-nowrap`} title={r.label}>
                  {r.label}
                </td>
                <td className={`${dsTableTd} text-right tabular-nums`}>{r.entrate}</td>
                <td className={`${dsTableTd} text-right tabular-nums`}>{r.uscite}</td>
                <td className={`${dsTableTd} text-right tabular-nums`}>{r.deltaQty > 0 ? `+${r.deltaQty}` : r.deltaQty}</td>
                <td className={`${dsTableTd} text-right tabular-nums text-xs sm:text-sm`}>
                  {r.deltaCapitale.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
                </td>
                <td className={`${dsTableTd} text-right text-xs font-semibold tabular-nums sm:text-sm`}>
                  {r.capitaleFinale.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-1 xl:grid-cols-2">
        <div className={`min-w-0 ${reportChartShellClass}`}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">Entrate vs uscite</p>
          {rows.length === 0 ? (
            <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun dato.</p>
          ) : (
            <MagazzinoEntrateUsciteBars rows={rows.map((r) => ({ label: r.label, entrate: r.entrate, uscite: r.uscite }))} />
          )}
        </div>
        <div className={`min-w-0 ${reportChartShellClass}`}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
            Capitale immobilizzato (fine mese)
          </p>
          {rows.length === 0 ? (
            <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun dato.</p>
          ) : (
            <MagazzinoCapitalLineChart rows={rows.map((r) => ({ label: r.label, capitaleFinale: r.capitaleFinale }))} />
          )}
        </div>
      </div>

      {open ? (
        <GestionaleModalShell
          modalSize="analytics"
          modalHeight="tall"
          title="Storico manuale magazzino"
          titleId="report-magazzino-manual-title"
          onRequestClose={() => setOpen(false)}
        >
          <div className={`${gestionaleModalBodyFlexClass} overflow-hidden`}>
            <GestionaleModalScrollBody className="space-y-0">
              <p className="text-xs text-[color:var(--cab-text-muted)]">
                Opzionale: sovrascrivi i valori calcolati per un mese. Lascia vuoto un campo per usare il valore automatico.
              </p>
              <label htmlFor="report-mag-manual-mese" className="mt-3 block text-xs text-[color:var(--cab-text-muted)]">
                Mese (YYYY-MM)
                <GlobalSelect
                  id="report-mag-manual-mese"
                  variant="default"
                  selectOnly
                  inputClassName={`${globalInputFieldFilter} mt-1 w-full`}
                  items={(rows.length ? rows : [{ key: key || "2026-01", label: key || "2026-01" }]).map((r) => ({
                    value: r.key,
                    label: r.key,
                  }))}
                  value={key}
                  onChange={(k) => {
                    setKey(k);
                    const p = manual[k] ?? {};
                    setEnt(p.entrate != null ? String(p.entrate) : "");
                    setUsc(p.uscite != null ? String(p.uscite) : "");
                    setDQty(p.deltaQty != null ? String(p.deltaQty) : "");
                    setDCap(p.deltaCapitale != null ? String(p.deltaCapitale) : "");
                    setCFin(p.capitaleFinale != null ? String(p.capitaleFinale) : "");
                  }}
                  strictFromList
                />
              </label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label htmlFor="report-mag-manual-entrate" className="text-xs text-[color:var(--cab-text-muted)]">
                  Entrate
                  <input
                    id="report-mag-manual-entrate"
                    className={`${dsInput} mt-1`}
                    inputMode="decimal"
                    value={ent}
                    onChange={(e) => setEnt(e.target.value)}
                  />
                </label>
                <label htmlFor="report-mag-manual-uscite" className="text-xs text-[color:var(--cab-text-muted)]">
                  Uscite
                  <input
                    id="report-mag-manual-uscite"
                    className={`${dsInput} mt-1`}
                    inputMode="decimal"
                    value={usc}
                    onChange={(e) => setUsc(e.target.value)}
                  />
                </label>
                <label htmlFor="report-mag-manual-dqty" className="text-xs text-[color:var(--cab-text-muted)]">
                  Δ Quantità
                  <input
                    id="report-mag-manual-dqty"
                    className={`${dsInput} mt-1`}
                    inputMode="decimal"
                    value={dQty}
                    onChange={(e) => setDQty(e.target.value)}
                  />
                </label>
                <label htmlFor="report-mag-manual-dcap" className="text-xs text-[color:var(--cab-text-muted)]">
                  Δ Capitale (€)
                  <input
                    id="report-mag-manual-dcap"
                    className={`${dsInput} mt-1`}
                    inputMode="decimal"
                    value={dCap}
                    onChange={(e) => setDCap(e.target.value)}
                  />
                </label>
                <label htmlFor="report-mag-manual-cfin" className="col-span-2 text-xs text-[color:var(--cab-text-muted)]">
                  Capitale finale (€)
                  <input
                    id="report-mag-manual-cfin"
                    className={`${dsInput} mt-1`}
                    inputMode="decimal"
                    value={cFin}
                    onChange={(e) => setCFin(e.target.value)}
                  />
                </label>
              </div>
            </GestionaleModalScrollBody>
            <div className="flex shrink-0 justify-end gap-2 border-t border-[color:var(--cab-border)] p-4">
              <button type="button" className={erpBtnNeutral} onClick={() => setOpen(false)}>
                Annulla
              </button>
              <button type="button" className={erpBtnAccent} onClick={saveManual}>
                Salva
              </button>
            </div>
          </div>
        </GestionaleModalShell>
      ) : null}
    </ShellCard>
  );
}
