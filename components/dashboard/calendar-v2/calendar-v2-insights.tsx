"use client";

import { useCallback, useMemo, useState } from "react";
import { GestionaleAiActionButton } from "@/components/design-system/gestionale-ai-action-button";
import { LoadingSkeletonBlock } from "@/components/design-system/loading/loading-skeleton";
import { buildReportModel } from "@/lib/report/build-report-model";
import { insightsFromAnalysisOutput } from "@/lib/report/calendar-report-service";
import { useReportAnalysis } from "@/lib/report/report-analysis/use-report-analysis";
import { buildKpiPerformanceModel } from "@/lib/report/kpi-performance/build-kpi-performance-model";
import { buildTopRicambiPeriodo } from "@/lib/report/report-classifiche";
import { compareRangeFor, dayRangeFromYmd, weekRangeFromYmd, ymdFromDate } from "@/lib/report/date-ranges";
import { useOperationalDiaryQuery } from "@/src/hooks/view/use-operational-diary";
import { useRbac } from "@/src/hooks/use-rbac";
import type { CalendarReportServiceInput } from "@/lib/report/calendar-report-service";
import type { ReportDerivedBundle } from "@/lib/report/report-derived-cache";
import type { ReportIntegrityBadgeView } from "@/lib/report/report-integrity-badge-model";
import type { CalendarSelection } from "@/components/dashboard/calendar-v2/calendar-v2-types";
import { dsTypoCaption, dsTypoSmall } from "@/lib/ui/design-system";

export function CalendarV2InsightsBlock({
  selection,
  serviceInput,
  derivedBundle,
  snapshotFingerprint,
  integrityView,
  deterministicInsights,
  canUseAi,
}: {
  selection: CalendarSelection;
  serviceInput: CalendarReportServiceInput;
  derivedBundle: ReportDerivedBundle;
  snapshotFingerprint: string;
  integrityView: ReportIntegrityBadgeView;
  deterministicInsights: string[];
  canUseAi: boolean;
}) {
  const [aiRequested, setAiRequested] = useState(false);
  const rbac = useRbac();
  const canReadDiary = rbac.canReadPage("dashboard");

  const filterRange = useMemo(() => {
    if (selection.mode === "day") return dayRangeFromYmd(selection.ymd);
    return weekRangeFromYmd(selection.weekStartYmd);
  }, [selection]);

  const compareRange = useMemo(
    () => (filterRange ? compareRangeFor(filterRange, "prev_period") : null),
    [filterRange],
  );

  const customFrom = filterRange ? ymdFromDate(filterRange.start) : "";
  const customTo = filterRange ? ymdFromDate(filterRange.end) : "";

  const model = useMemo(() => {
    if (!filterRange) return null;
    return buildReportModel({
      anchor: serviceInput.anchor,
      preset: "custom",
      customFrom,
      customTo,
      compareMode: "prev_period",
      attive: serviceInput.attive,
      storico: serviceInput.storico,
      completate: serviceInput.completate,
      manualByMonth: serviceInput.manualByMonth,
      magazzino: serviceInput.magazzino,
      mezzi: serviceInput.mezzi,
      magLog: serviceInput.magLog,
      semanticIndex: derivedBundle.semanticIndex,
      derivedBundle,
    });
  }, [filterRange, customFrom, customTo, serviceInput, derivedBundle]);

  const perf = useMemo(() => {
    if (!filterRange) return null;
    return buildKpiPerformanceModel({
      anchor: serviceInput.anchor,
      range: filterRange,
      compareRange,
      attive: serviceInput.attive,
      completate: serviceInput.completate,
      mezzi: serviceInput.mezzi,
      magazzino: serviceInput.magazzino,
      magLog: serviceInput.magLog,
      magazzinoRows: serviceInput.magazzino.map((p) => ({
        id: p.id,
        costo: p.prezzoFornitoreOriginale,
      })) as import("@/src/types/supabase-tables").MagazzinoRicambioRow[],
      lavRows: serviceInput.lavRows,
      semanticIndex: derivedBundle.semanticIndex,
      schedeStore: null,
      schedeLoaded: false,
      costoOrario: 48,
    });
  }, [filterRange, compareRange, serviceInput, derivedBundle.semanticIndex]);

  const tops = useMemo(() => {
    if (!filterRange) return { mezzi: [], clienti: [], ricambi: [] };
    return {
      mezzi: derivedBundle.semanticIndex.topMezzi(filterRange),
      clienti: derivedBundle.semanticIndex.topClienti(filterRange),
      ricambi: buildTopRicambiPeriodo(derivedBundle.magLogSorted, serviceInput.magazzino, filterRange),
    };
  }, [filterRange, derivedBundle, serviceInput.magazzino]);

  const diaryFromYmd = filterRange ? ymdFromDate(filterRange.start) : undefined;
  const diaryToYmd = filterRange ? ymdFromDate(filterRange.end) : undefined;
  const { data: diaryRows = [] } = useOperationalDiaryQuery(
    { fromYmd: diaryFromYmd, toYmd: diaryToYmd },
    { enabled: !rbac.isLoading && canReadDiary && Boolean(diaryFromYmd && diaryToYmd) },
  );
  const diaryEntries = useMemo(
    () => diaryRows.map((e) => ({ workDate: e.work_date, body: e.body })),
    [diaryRows],
  );

  const analysis = useReportAnalysis({
    preset: "custom",
    compareMode: "prev_period",
    filterRange: filterRange ?? { start: new Date(), end: new Date() },
    compareRange,
    model: model ?? {
      range: filterRange ?? { start: new Date(), end: new Date() },
      compareRange,
      compareMode: "prev_period" as const,
      kpis: [],
      compareDetail: null,
    },
    perf,
    integrityView,
    tops,
    diaryEntries,
    snapshotFingerprint,
    perfReady: aiRequested && Boolean(model && perf && filterRange),
  });

  const aiInsights = useMemo(() => insightsFromAnalysisOutput(analysis.data), [analysis.data]);
  const displayInsights = aiRequested && analysis.status === "success" ? aiInsights : deterministicInsights;

  const onGenerate = useCallback(() => {
    setAiRequested(true);
    void analysis.generate();
  }, [analysis]);

  if (!filterRange || !model) {
    return null;
  }

  return (
    <section className="min-w-0 space-y-2" aria-labelledby="calendar-v2-insights-title">
      <div className="flex min-w-0 items-center justify-between gap-2 flex-nowrap sm:flex-wrap">
        <h3 id="calendar-v2-insights-title" className={`${dsTypoSmall} font-semibold text-[color:var(--cab-text)]`}>
          Insight
        </h3>
        {canUseAi ? (
          <GestionaleAiActionButton
            size="sm"
            loading={analysis.isLoading}
            disabled={!analysis.canGenerate && !analysis.isLoading}
            onClick={onGenerate}
          >
            {analysis.status === "success" ? "Rigenera insight IA" : "Genera insight IA"}
          </GestionaleAiActionButton>
        ) : null}
      </div>
      {analysis.isLoading ? (
        <LoadingSkeletonBlock className="h-16 w-full rounded-lg" />
      ) : displayInsights.length === 0 ? (
        <p className={`${dsTypoCaption} text-[color:var(--cab-text-muted)]`}>Nessun insight per questo periodo.</p>
      ) : (
        <ul className="min-w-0 space-y-1.5">
          {displayInsights.map((line, i) => (
            <li
              key={`${i}-${line.slice(0, 24)}`}
              className={`${dsTypoSmall} rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-2.5 py-2 text-[color:var(--cab-text)]`}
            >
              {line}
            </li>
          ))}
        </ul>
      )}
      {analysis.status === "error" ? (
        <p className={`${dsTypoCaption} text-[color:var(--cab-danger)]`}>{analysis.error?.message ?? "Errore IA"}</p>
      ) : null}
    </section>
  );
}
