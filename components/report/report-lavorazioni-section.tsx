"use client";

import { sliceInputValue, TEXT_LONG } from "@/lib/validation/text-field-limits";
import { memo, useCallback, useMemo, useState } from "react";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import { ShellCard } from "@/components/gestionale/shell-card";
import { GlobalSelect } from "@/components/gestionale/global-input";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { GlobalTableHead, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import { ReportCompareBanner } from "@/components/report/report-compare-banner";
import { ReportYearlyForecastLineChart } from "@/components/report/report-charts";
import { reportChartShellClass } from "@/components/report/report-ui-tokens";
import { erpBtnAccent, erpBtnNeutral } from "@/components/report/report-buttons";
import type { ReportCompareDetail } from "@/lib/report/build-report-model";
import { deltaPct, type DateRange } from "@/lib/report/date-ranges";
import type { ReportSemanticIndex } from "@/lib/report/report-semantic-index";
import { monthInReportRange } from "@/lib/report/report-temporal-filter";
import { yearlyForecastLineModel, type LavorazioniYearRow } from "@/lib/report/lavorazioni-year-matrix";
import { formatPeriodMonthLabel, periodMonthToKey } from "@/lib/report/report-manual-entries-map";
import {
  useReportManualEntryRemoveMutation,
  useReportManualEntryUpsertMutation,
} from "@/src/hooks/view/use-report-manual-entries";
import type { ReportManualEntryRow } from "@/src/types/supabase-tables";
import {
  dsInput,
  dsScrollbar,
  dsTableRow,
  dsTableTd,
  dsTableWrap,
  dsTypoCaption,
  dsTypoSmall,
} from "@/lib/ui/design-system";
import { globalInputFieldFilter } from "@/lib/ui/global-input";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import {
  globalTableFixed,
  globalTableHeadEdgeInset,
  globalTableRow,
  globalTableThCell,
  globalTableThLabel,
  globalTableWrap,
} from "@/lib/ui/global-table";

const MONTHS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"] as const;

function ymKey(y: number, m0: number): string {
  return `${y}-${String(m0 + 1).padStart(2, "0")}`;
}

function rowHeatMax(row: LavorazioniYearRow, filterRange: DateRange): number {
  const vals: number[] = [];
  for (let mi = 0; mi < 12; mi += 1) {
    if (monthInReportRange(row.year, mi, filterRange)) vals.push(row.months[mi] ?? 0);
  }
  return Math.max(1, ...vals, 0);
}

function heatTextClass(v: number, rowMax: number): string {
  if (rowMax <= 0 || v <= 0) return "text-[color:var(--cab-text-muted)]";
  const t = Math.min(1, v / rowMax);
  if (t > 0.85) return "font-semibold text-[color:var(--cab-primary)]";
  if (t > 0.65) return "font-medium text-[color:color-mix(in_srgb,var(--cab-primary)_82%,var(--cab-text))]";
  if (t > 0.45) return "text-[color:var(--cab-text)]";
  return "text-[color:var(--cab-text-muted)]";
}

function fmtPct(p: number | null): string {
  if (p == null) return "—";
  const s = p > 0 ? "+" : "";
  return `${s}${p.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
}

function pastMonthOptions(anchor: Date, count = 48): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const d = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
  for (let i = 0; i < count; i++) {
    const y = d.getFullYear();
    const mo = d.getMonth();
    const value = `${y}-${String(mo + 1).padStart(2, "0")}`;
    out.push({ value, label: formatPeriodMonthLabel(`${value}-01`) });
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

function ReportLavorazioniSectionInner({
  attive,
  completate,
  manualEntries,
  anchor,
  filterRange,
  compareDetail,
  semanticIndex,
}: {
  attive: LavorazioneAttiva[];
  completate: LavorazioneArchiviata[];
  manualEntries: ReportManualEntryRow[];
  anchor: Date;
  filterRange: DateRange;
  compareDetail: ReportCompareDetail | null;
  semanticIndex: ReportSemanticIndex;
}) {
  const upsertMutation = useReportManualEntryUpsertMutation();
  const removeMutation = useReportManualEntryRemoveMutation();

  const monthOptions = useMemo(() => pastMonthOptions(anchor), [anchor]);
  const { rows, monthLabels, hasAnyData, manualMonthKeys, matrixMode, forecastRows, heatByYear } = useMemo(() => {
    const matrix = semanticIndex.buildYearMatrix(anchor, filterRange);
    const heat = new Map<number, { rowMax: number; bestMi: number | null; worstMi: number | null }>();
    for (const row of matrix.rows) {
      heat.set(row.year, {
        rowMax: rowHeatMax(row, filterRange),
        bestMi: row.bestMonthIdx,
        worstMi: row.worstMonthIdx,
      });
    }
    return { ...matrix, heatByYear: heat };
  }, [semanticIndex, anchor, filterRange]);
  const forecast = useMemo(() => yearlyForecastLineModel(forecastRows, anchor), [forecastRows, anchor]);

  const [open, setOpen] = useState(false);
  const [periodMonth, setPeriodMonth] = useState(monthOptions[0]?.value ?? "");
  const [completedCount, setCompletedCount] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const openModal = useCallback(() => {
    const first = monthOptions[0]?.value ?? "";
    setPeriodMonth(first);
    const existing = manualEntries.find((e) => periodMonthToKey(e.period_month) === first);
    setCompletedCount(existing ? String(existing.completed_count) : "");
    setNote(existing?.note ?? "");
    setFormError(null);
    setOpen(true);
  }, [monthOptions, manualEntries]);

  const onPeriodChange = useCallback(
    (value: string) => {
      setPeriodMonth(value);
      const existing = manualEntries.find((e) => periodMonthToKey(e.period_month) === value);
      setCompletedCount(existing ? String(existing.completed_count) : "");
      setNote(existing?.note ?? "");
      setFormError(null);
    },
    [manualEntries],
  );

  const saveManual = useCallback(async () => {
    const count = Number(completedCount);
    if (!Number.isFinite(count) || count < 0) {
      setFormError("Inserisci un numero valido di lavorazioni completate.");
      return;
    }
    setFormError(null);
    try {
      await upsertMutation.mutateAsync({
        periodMonth,
        completedCount: count,
        note: note.trim() || null,
      });
      setOpen(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Salvataggio non riuscito.");
    }
  }, [completedCount, note, periodMonth, upsertMutation]);

  const removeEntry = useCallback(
    async (id: string) => {
      try {
        await removeMutation.mutateAsync(id);
      } catch {
        /* mutation surfaces error */
      }
    },
    [removeMutation],
  );

  const cmpLine =
    compareDetail != null ? (
      <ReportCompareBanner>
        <span className="font-semibold">Confronto periodo</span>
        {" · "}
        Archiviate: {compareDetail.completedCur} vs {compareDetail.completedPrev} (
        {fmtPct(deltaPct(compareDetail.completedCur, compareDetail.completedPrev))}
        {compareDetail.completedCur - compareDetail.completedPrev !== 0 ? (
          <span className="tabular-nums">
            {" "}
            · Δ {compareDetail.completedCur - compareDetail.completedPrev > 0 ? "+" : ""}
            {compareDetail.completedCur - compareDetail.completedPrev}
          </span>
        ) : null}
        ) · Ingressi: {compareDetail.openedCur} vs {compareDetail.openedPrev} (
        {fmtPct(deltaPct(compareDetail.openedCur, compareDetail.openedPrev))})
      </ReportCompareBanner>
    ) : null;

  return (
    <ShellCard
      id="report-lavorazioni"
      title="Andamento lavorazioni"
      collapsible
      defaultCollapsed={false}
      headerActions={
        <button type="button" onClick={openModal} className={`${erpBtnNeutral} shrink-0 sm:text-sm`}>
          Dati storici manuali
        </button>
      }
    >
      {cmpLine}

      {!hasAnyData ? (
        <p className="mb-4 rounded-lg border border-dashed border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_40%,var(--cab-card))] p-3 text-sm text-[color:var(--cab-text-muted)]">
          Nessun dato disponibile: non risultano lavorazioni archiviate con data di chiusura. Puoi inserire dati
          storici manuali per mesi precedenti.
        </p>
      ) : null}

      <div className="grid min-w-0 gap-6 lg:grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(240px,0.65fr)]">
        <div className="min-w-0">
          {matrixMode === "filtered" ? (
            <p className={`mb-2 ${dsTypoCaption}`}>
              Matrice filtrata sul periodo selezionato: totali e variazioni includono solo i mesi nel filtro.
            </p>
          ) : null}
          <div className={`${globalTableWrap} ${dsScrollbar}`}>
            <table className={`${globalTableFixed} min-w-[720px]`}>
              <GlobalTableHead sticky>
                <tr className={`h-14 ${globalTableHeadEdgeInset}`}>
                  <th
                    scope="col"
                    className={`${globalTableThCell} ${globalTableThLabel} min-w-[3.5rem] border-b border-[color:var(--cab-border)] text-center`}
                  >
                    Anno
                  </th>
                  {monthLabels.map((lab, mi) => (
                    <th
                      key={`h-${mi}-${lab}`}
                      scope="col"
                      title={lab}
                      className={`${globalTableThCell} ${globalTableThLabel} min-w-[2.5rem] border-b border-[color:var(--cab-border)] px-1 text-center`}
                    >
                      {lab}
                    </th>
                  ))}
                  <th
                    scope="col"
                    className={`${globalTableThCell} ${globalTableThLabel} min-w-[3.5rem] border-b border-[color:var(--cab-border)] text-center`}
                  >
                    Totale
                  </th>
                  <th
                    scope="col"
                    title="Variazione percentuale rispetto all'anno precedente"
                    className={`${globalTableThCell} ${globalTableThLabel} min-w-[3.5rem] border-b border-[color:var(--cab-border)] text-center`}
                  >
                    Vs prec.
                  </th>
                </tr>
              </GlobalTableHead>
              <tbody>
                {rows.map((row) => {
                  const hm = heatByYear.get(row.year)!;
                  return (
                    <tr key={row.year} className={`h-12 ${globalTableRow}`}>
                      <td className="border-r border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_65%,var(--cab-card))] px-2 py-2 text-center align-middle text-sm font-semibold tabular-nums text-[color:var(--cab-text)]">
                        {row.year}
                      </td>
                      {row.months.map((v, mi) => {
                        const mk = ymKey(row.year, mi);
                        const isManual = manualMonthKeys.has(mk);
                        const inF = monthInReportRange(row.year, mi, filterRange);
                        const heatTxt = heatTextClass(v, hm.rowMax);
                        const isBest = inF && hm.bestMi === mi && v > 0;
                        const isWorst = inF && hm.worstMi === mi && v > 0 && hm.worstMi !== hm.bestMi;
                        return (
                          <td
                            key={`${row.year}-${mi}`}
                            className={`border-r border-[color:var(--cab-border)] px-0.5 py-2 text-center align-middle text-sm tabular-nums leading-tight ${heatTxt} ${
                              isBest
                                ? "bg-[color:color-mix(in_srgb,var(--cab-success)_12%,var(--cab-card))] ring-1 ring-inset ring-[color:color-mix(in_srgb,var(--cab-success)_45%,var(--cab-border))]"
                                : ""
                            } ${
                              isWorst
                                ? "bg-[color:color-mix(in_srgb,var(--cab-danger)_10%,var(--cab-card))] ring-1 ring-inset ring-[color:color-mix(in_srgb,var(--cab-danger)_40%,var(--cab-border))]"
                                : ""
                            }`}
                            title={
                              isManual
                                ? `${mk}: ${v} (include dato storico manuale)`
                                : `${mk}: ${v}`
                            }
                          >
                            <span className={inF ? "" : "opacity-45"}>
                              {v > 0 ? v : "—"}
                              {isManual && v > 0 ? (
                                <span className="ml-0.5 text-[10px] text-[color:var(--cab-primary)]">*</span>
                              ) : null}
                            </span>
                          </td>
                        );
                      })}
                      <td className="border-l border-[color:var(--cab-border)] px-2 py-2 text-center align-middle text-sm font-semibold tabular-nums text-[color:var(--cab-primary)]">
                        {row.total}
                      </td>
                      <td className="border-l border-[color:var(--cab-border)] px-2 py-2 text-center align-middle text-sm font-semibold tabular-nums text-[color:var(--cab-primary)]">
                        {row.growthVsPrevPct == null ? "—" : `${row.growthVsPrevPct > 0 ? "+" : ""}${row.growthVsPrevPct}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {manualMonthKeys.size > 0 ? (
            <p className={`mt-2 ${dsTypoCaption}`}>* Mese con dato storico manuale</p>
          ) : null}
        </div>

        <div className={`min-w-0 ${reportChartShellClass}`}>
          <p className={`${dsTypoCaption} mb-2 font-semibold uppercase tracking-wide text-[color:var(--cab-text)]`}>
            Andamento annuale e previsione
          </p>
          {forecast.solid.length === 0 ? (
            <p className={dsTypoSmall}>Nessun dato disponibile per il grafico.</p>
          ) : (
            <>
              <ReportYearlyForecastLineChart
                solid={forecast.solid}
                dashed={forecast.dashed}
                forecastYear={forecast.forecastYear}
                forecastYearEnd={forecast.forecastYearEnd}
              />
              <ul className={`mt-3 space-y-1 ${dsTypoSmall}`}>
                <li>
                  <span className="inline-block h-0.5 w-6 rounded-full bg-sky-500 align-middle" /> Storico annuale
                  (archiviate)
                </li>
                <li>
                  <span className="inline-block h-0.5 w-6 rounded-full bg-sky-500 align-middle" /> Anno in corso (YTD)
                </li>
                <li>
                  <span
                    className="inline-block h-0.5 w-6 rounded-full bg-[color:var(--cab-primary)] align-middle"
                    style={{ borderStyle: "dashed" }}
                  />{" "}
                  Previsione fine anno (regressione pesata + ritmo corrente)
                </li>
              </ul>
              <p className={`mt-2 ${dsTypoSmall}`}>
                YTD {anchor.getFullYear()}: <span className="font-semibold text-[color:var(--cab-text)]">{forecast.ytd}</span>
                {forecast.forecastYearEnd != null ? (
                  <>
                    {" "}
                    — Stima fine anno:{" "}
                    <span className="font-semibold text-[color:var(--cab-text)]">{forecast.forecastYearEnd}</span>
                  </>
                ) : null}
              </p>
              {matrixMode === "filtered" ? (
                <p className={`mt-1 ${dsTypoCaption}`}>
                  Previsione su anno solare completo (non filtrata per periodo).
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>

      {manualEntries.length > 0 ? (
        <div className="mt-6">
          <p className={`${dsTypoCaption} mb-2 font-semibold uppercase tracking-wide`}>Storico manuale registrato</p>
          <div className={`${dsTableWrap} ${dsScrollbar}`}>
            <table className="w-full min-w-[480px] text-sm">
              <GlobalTableHead>
                <GlobalTableHeadLabel label="Periodo" />
                <GlobalTableHeadLabel label="Completate" />
                <GlobalTableHeadLabel label="Note" />
                <GlobalTableHeadLabel label="" thClassName="w-20" />
              </GlobalTableHead>
              <tbody>
                {manualEntries.map((e) => (
                  <tr key={e.id} className={dsTableRow}>
                    <td className={dsTableTd}>{formatPeriodMonthLabel(e.period_month)}</td>
                    <td className={`${dsTableTd} tabular-nums`}>{e.completed_count}</td>
                    <td className={`${dsTableTd} max-w-[240px] truncate`} title={e.note ?? undefined}>
                      {e.note?.trim() || "—"}
                    </td>
                    <td className={`${dsTableTd} text-right`}>
                      <button
                        type="button"
                        className="text-xs text-[color:var(--cab-danger)] hover:underline"
                        disabled={removeMutation.isPending}
                        onClick={() => void removeEntry(e.id)}
                      >
                        Elimina
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {open ? (
        <GestionaleModalShell
          modalSize="analytics"
          modalHeight="tall"
          title="Dati storici manuali"
          titleId="report-lavorazioni-manual-title"
          onRequestClose={() => setOpen(false)}
        >
          <div className={`${gestionaleModalBodyFlexClass} overflow-hidden`}>
            <GestionaleModalScrollBody className="space-y-0">
              <p className="text-xs text-[color:var(--cab-text-muted)]">
                Inserisci il numero di lavorazioni completate per un mese passato. Non modifica le lavorazioni operative
                nel gestionale.
              </p>
              <label htmlFor="report-manual-period" className="mt-3 block text-xs text-[color:var(--cab-text-muted)]">
                Periodo (solo mesi precedenti)
                <GlobalSelect
                  id="report-manual-period"
                  variant="default"
                  selectOnly
                  inputClassName={`${globalInputFieldFilter} mt-1 w-full`}
                  items={monthOptions.map((o) => ({ value: o.value, label: o.label }))}
                  value={periodMonth}
                  onChange={onPeriodChange}
                  strictFromList
                />
              </label>
              <label htmlFor="report-manual-count" className="mt-3 block text-xs text-[color:var(--cab-text-muted)]">
                Lavorazioni completate
                <input
                  id="report-manual-count"
                  className={`${dsInput} mt-1`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={completedCount}
                  onChange={(e) => setCompletedCount(e.target.value)}
                />
              </label>
              <label htmlFor="report-manual-note" className="mt-3 block text-xs text-[color:var(--cab-text-muted)]">
                Note (opzionale)
                <input
                  id="report-manual-note"
                  className={`${dsInput} mt-1`}
                  value={note}
                  onChange={(e) => setNote(sliceInputValue(e.target.value, TEXT_LONG))}
                  maxLength={TEXT_LONG}
                />
              </label>
              {formError ? (
                <p role="alert" className="mt-2 text-xs text-[color:var(--cab-danger)]">
                  {formError}
                </p>
              ) : null}
            </GestionaleModalScrollBody>
            <div className="flex shrink-0 justify-end gap-2 border-t border-[color:var(--cab-border)] p-4">
              <button type="button" className={erpBtnNeutral} onClick={() => setOpen(false)}>
                Annulla
              </button>
              <button
                type="button"
                className={erpBtnAccent}
                disabled={upsertMutation.isPending}
                onClick={() => void saveManual()}
              >
                Salva
              </button>
            </div>
          </div>
        </GestionaleModalShell>
      ) : null}
    </ShellCard>
  );
}

export const ReportLavorazioniSection = memo(ReportLavorazioniSectionInner);
