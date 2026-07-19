"use client";

import { Tooltip } from "@/components/ui";
import { memo, useCallback, useMemo, useRef, useState, type ChangeEvent } from "react";
import dynamic from "next/dynamic";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import { ShellCard } from "@/components/gestionale/shell-card";
import { GlobalTableHead } from "@/components/gestionale/global-table";
import { ReportCompareBanner } from "@/components/report/report-compare-banner";
import { ReportYearlyForecastLineChart } from "@/components/report/report-charts";
import { reportChartShellClass } from "@/components/report/report-ui-tokens";
import { erpBtnAccent, erpBtnNeutral } from "@/components/report/report-buttons";
import type { ReportCompareDetail } from "@/lib/report/build-report-model";
import { deltaPct, type DateRange } from "@/lib/report/date-ranges";
import type { ReportSemanticIndex } from "@/lib/report/report-semantic-index";
import { yearlyForecastLineModel } from "@/lib/report/lavorazioni-year-matrix";
import {
  downloadReportManualEntriesTemplate,
  importReportManualEntriesFromFile,
} from "@/lib/report/report-manual-entries-import-client";
import type { ReportManualEntriesImportResult } from "@/lib/report/report-manual-entries-import-types";
import { bumpReportDataRefresh } from "@/lib/report/report-broadcast";
import { invalidateReportDerivedCache } from "@/lib/report/report-derived-cache";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { useQueryClient } from "@tanstack/react-query";
import { QK } from "@/src/lib/react-query/query-keys";
import {
  dsScrollbar,
  dsTypoCaption,
  dsTypoSmall,
} from "@/lib/ui/design-system";
import {
  globalTableFixed,
  globalTableHeadEdgeInset,
  globalTableRow,
  globalTableThCell,
  globalTableThLabel,
  globalTableWrap,
} from "@/lib/ui/global-table";

const ReportLavorazioniImportResultModal = dynamic(
  () =>
    import("@/components/report/report-lavorazioni-import-result-modal").then(
      (m) => m.ReportLavorazioniImportResultModal,
    ),
);

const REPORT_MANUAL_IMPORT_ACCEPT = ".xlsx,.xls,.csv";

function ymKey(y: number, m0: number): string {
  return `${y}-${String(m0 + 1).padStart(2, "0")}`;
}

function fmtPct(p: number | null): string {
  if (p == null) return "—";
  const s = p > 0 ? "+" : "";
  return `${s}${p.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
}

function ReportLavorazioniSectionInner({
  attive,
  completate,
  anchor,
  filterRange,
  compareDetail,
  semanticIndex,
  embed = false,
}: {
  attive: LavorazioneAttiva[];
  completate: LavorazioneArchiviata[];
  anchor: Date;
  filterRange: DateRange;
  compareDetail: ReportCompareDetail | null;
  semanticIndex: ReportSemanticIndex;
  embed?: boolean;
}) {
  const gestToast = useGestionaleToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { rows, monthLabels, hasAnyData, forecastRows } = useMemo(() => {
    return semanticIndex.buildYearMatrix(anchor, filterRange);
  }, [semanticIndex, anchor, filterRange]);
  const forecast = useMemo(() => yearlyForecastLineModel(forecastRows, anchor), [forecastRows, anchor]);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ReportManualEntriesImportResult | null>(null);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(
    async (file: File) => {
      setImporting(true);
      try {
        const result = await importReportManualEntriesFromFile(file);
        invalidateReportDerivedCache();
        await queryClient.invalidateQueries({ queryKey: QK.reportManualEntries });
        await queryClient.refetchQueries({ queryKey: QK.reportManualEntries });
        bumpReportDataRefresh();
        setImportResult(result);
        const total = result.imported + result.updated;
        if (total > 0) {
          gestToast.success(
            total === 1
              ? "1 periodo importato da Excel."
              : `${total} periodi importati da Excel (${result.imported} nuovi, ${result.updated} aggiornati).`,
          );
        }
      } catch (e) {
        gestToast.error(e instanceof Error ? e.message : "Import Excel non riuscito.");
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [gestToast, queryClient],
  );

  const onFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) void handleImportFile(file);
    },
    [handleImportFile],
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

  const manualBtn = (
  <>
      <input
        ref={fileInputRef}
        type="file"
        accept={REPORT_MANUAL_IMPORT_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={onFileInputChange}
      />
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          className={`${erpBtnNeutral} shrink-0 sm:text-sm`}
          disabled={importing}
          onClick={() => downloadReportManualEntriesTemplate()}
        >
          Scarica modello Excel
        </button>
        <button
          type="button"
          className={`${erpBtnNeutral} shrink-0 sm:text-sm`}
          disabled={importing}
          onClick={openFilePicker}
        >
          {importing ? "Import in corso…" : "Importa dati da file Excel"}
        </button>
      </div>
    </>
  );

  const panel = (
    <>
      {cmpLine}

      {!hasAnyData ? (
        <p className="mb-4 rounded-lg border border-dashed border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_40%,var(--cab-card))] p-3 text-sm text-[color:var(--cab-text-muted)]">
          Nessun dato disponibile: non risultano lavorazioni archiviate con data di chiusura. Puoi importare dati
          storici da file Excel per mesi precedenti.
        </p>
      ) : null}

      <div className="grid min-w-0 gap-6 lg:grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(240px,0.65fr)]">
        <div className="min-w-0">
          <div className={`${globalTableWrap} ${dsScrollbar} min-w-0`}>
            <table className={`${globalTableFixed} w-full min-w-0`}>
              <colgroup>
                <col className="w-[8%]" />
                {monthLabels.map((lab, mi) => (
                  <col key={`col-${mi}-${lab}`} className="w-[6%]" />
                ))}
                <col className="w-[8%]" />
                <col className="w-[8%]" />
              </colgroup>
              <GlobalTableHead sticky>
                <tr className={`h-14 ${globalTableHeadEdgeInset}`}>
                  <th
                    scope="col"
                    className={`${globalTableThCell} ${globalTableThLabel} min-w-0 border-b border-[color:var(--cab-border)] text-center`}
                  >
                    Anno
                  </th>
                  {monthLabels.map((lab, mi) => (
                    // ui-contract-disable-next-line native-title-tooltip: month header full label on hover for narrow columns
                    <th
                      key={`h-${mi}-${lab}`}
                      scope="col"
                      title={lab}
                      className={`${globalTableThCell} ${globalTableThLabel} min-w-0 border-b border-[color:var(--cab-border)] px-1 text-center`}
                    >
                      {lab}
                    </th>
                  ))}
                  <th
                    scope="col"
                    className={`${globalTableThCell} ${globalTableThLabel} min-w-0 border-b border-[color:var(--cab-border)] text-center`}
                  >
                    Totale
                  </th>
                  <th
                    scope="col"
                    className={`${globalTableThCell} ${globalTableThLabel} min-w-0 border-b border-[color:var(--cab-border)] text-center`}
                  >
                    <Tooltip content={"Variazione percentuale rispetto all'anno precedente"}>
                      <span className="block truncate">Vs prec.</span>
                    </Tooltip>
                  </th>
                </tr>
              </GlobalTableHead>
              <tbody>
                {rows.map((row) => (
                    <tr key={row.year} className={`h-12 ${globalTableRow}`}>
                      <td className="border-r border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_65%,var(--cab-card))] px-2 py-2 text-center align-middle text-sm font-semibold tabular-nums text-[color:var(--cab-text)]">
                        {row.year}
                      </td>
                      {row.months.map((v, mi) => {
                        const mk = ymKey(row.year, mi);
                        return (
                          <td
                            key={`${row.year}-${mi}`}
                            className="border-r border-[color:var(--cab-border)] px-0.5 py-2 text-center align-middle text-sm tabular-nums leading-tight text-[color:var(--cab-text)]"
                          >
                            <Tooltip content={`${mk}: ${v}`}>
                              <span className="block w-full">
                                {v > 0 ? v : <span className="text-[color:var(--cab-text-muted)]">—</span>}
                              </span>
                            </Tooltip>
                          </td>
                        );
                      })}
                      <td className="border-l border-[color:var(--cab-border)] px-2 py-2 text-center align-middle text-sm tabular-nums text-[color:var(--cab-text)]">
                        {row.total}
                      </td>
                      <td className="border-l border-[color:var(--cab-border)] px-2 py-2 text-center align-middle text-sm tabular-nums text-[color:var(--cab-text)]">
                        {row.growthVsPrevPct == null ? "—" : `${row.growthVsPrevPct > 0 ? "+" : ""}${row.growthVsPrevPct}%`}
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            </>
          )}
        </div>
      </div>
    </>
  );

  const importResultModal =
    importResult ? (
      <ReportLavorazioniImportResultModal result={importResult} onClose={() => setImportResult(null)} />
    ) : null;

  if (embed) {
    return (
      <div className="min-w-0">
        <div className="mb-3 flex justify-end">{manualBtn}</div>
        {panel}
        {importResultModal}
      </div>
    );
  }

  return (
    <>
      <ShellCard
        id="report-lavorazioni"
        title="Andamento lavorazioni"
        collapsible
        defaultCollapsed={false}
        persistScope="report"
        persistKey="lavorazioni-chart"
        headerActions={manualBtn}
      >
        {panel}
      </ShellCard>
      {importResultModal}
    </>
  );
}

export const ReportLavorazioniSection = memo(ReportLavorazioniSectionInner);
