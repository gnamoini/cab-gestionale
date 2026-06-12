"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useUIAutonomyFixEngine } from "@/lib/ui-autonomy-fix/use-ui-autonomy-fix-engine";
import { PageHeader } from "@/components/gestionale/page-header";
import { ShellCard } from "@/components/gestionale/shell-card";
import { ReportExecutiveOverview } from "@/components/report/layout/report-executive-overview";
import { ReportOperationalAnalysisZone } from "@/components/report/layout/report-operational-analysis-zone";
import { ReportPerformanceGate } from "@/components/report/layout/report-performance-gate";
import { ReportToolbar } from "@/components/report/layout/report-toolbar";
import { LoadingCardSkeleton } from "@/components/design-system";

const ReportTrendsZone = dynamic(
  () => import("@/components/report/layout/report-trends-zone").then((m) => m.ReportTrendsZone),
  { loading: () => <LoadingCardSkeleton minHeightClass="min-h-[12rem]" /> },
);
const ReportMaintenanceZone = dynamic(
  () => import("@/components/report/layout/report-maintenance-zone").then((m) => m.ReportMaintenanceZone),
  { loading: () => <LoadingCardSkeleton minHeightClass="min-h-[16rem]" /> },
);
import { ReportIntegrityStatusBadge } from "@/components/report/report-integrity-status-badge";
import { buildReportModel } from "@/lib/report/build-report-model";
import { endOfLocalDay, startOfLocalDay, type ReportCompareMode, type ReportPeriodPreset } from "@/lib/report/date-ranges";
import type { DateRange } from "@/lib/report/date-ranges";
import {
  buildTopRicambiPeriodo,
  mergeTopClientiCompare,
  mergeTopMezziCompare,
  mergeTopRicambiCompare,
} from "@/lib/report/report-classifiche";
import { buildReportDerivedBundle } from "@/lib/report/report-derived-cache";
import {
  loadMagazzinoManualMonthMap,
  revisionMagazzinoManualMonthMap,
} from "@/lib/report/magazzino-manual-storage";
import {
  loadReportPeriodPrefs,
  saveReportPeriodPrefs,
} from "@/lib/report/report-period-persistence";
import { useReportLiveData } from "@/lib/report/use-report-live-data";
import { LoadingErrorState, LoadingReportSkeleton } from "@/components/design-system";
import { dsStackPage } from "@/lib/ui/design-system";

function fmtYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDaysLocal(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12, 0, 0, 0);
}

function ReportSkeleton() {
  return <LoadingReportSkeleton />;
}

function useStableDateRange(range: DateRange | null | undefined): DateRange | null {
  const startMs = range?.start.getTime();
  const endMs = range?.end.getTime();
  return useMemo(() => {
    if (startMs == null || endMs == null) return null;
    return { start: new Date(startMs), end: new Date(endMs) };
  }, [startMs, endMs]);
}

function readInitialPeriodPrefs(): {
  preset: ReportPeriodPreset;
  compareMode: ReportCompareMode;
  customFrom: string;
  customTo: string;
} {
  const defaults = {
    preset: "last_3_months" as ReportPeriodPreset,
    compareMode: "none" as ReportCompareMode,
    customFrom: "",
    customTo: "",
  };
  const saved = loadReportPeriodPrefs();
  if (!saved) return defaults;
  let nextPreset = saved.preset;
  let nextFrom = saved.customFrom;
  let nextTo = saved.customTo;
  if (nextPreset === "custom" && (!nextFrom || !nextTo)) {
    nextPreset = "last_30_days";
    nextFrom = "";
    nextTo = "";
  }
  return {
    preset: nextPreset,
    compareMode: saved.compareMode,
    customFrom: nextFrom,
    customTo: nextTo,
  };
}

export function ReportAnalyticsView() {
  const anchor = useMemo(() => new Date(), []);
  const [initialPrefs] = useState(readInitialPeriodPrefs);
  const [preset, setPreset] = useState<ReportPeriodPreset>(initialPrefs.preset);
  const [customFrom, setCustomFrom] = useState(initialPrefs.customFrom);
  const [customTo, setCustomTo] = useState(initialPrefs.customTo);
  const [compareMode, setCompareMode] = useState<ReportCompareMode>(initialPrefs.compareMode);
  const [histRev, setHistRev] = useState(0);
  useUIAutonomyFixEngine("/report", [preset, compareMode, histRev]);

  useEffect(() => {
    saveReportPeriodPrefs({ preset, compareMode, customFrom, customTo });
  }, [preset, compareMode, customFrom, customTo]);

  const live = useReportLiveData();

  const magManualRevision = useMemo(
    () => revisionMagazzinoManualMonthMap(loadMagazzinoManualMonthMap()),
    [histRev],
  );

  const derivedBundle = useMemo(
    () =>
      buildReportDerivedBundle({
        completate: live.completate,
        manualByMonth: live.manualByMonth,
        mezzi: live.mezzi,
        magLog: live.magLog,
        magazzino: live.magazzino,
        queryMeta: live.integrityView.queryMeta,
        magManualRevision,
      }),
    [
      live.completate,
      live.manualByMonth,
      live.mezzi,
      live.magLog,
      live.magazzino,
      live.integrityView.queryMeta,
      live.snapshotFingerprint,
      magManualRevision,
    ],
  );

  const semanticIndex = derivedBundle.semanticIndex;

  const integrityBadge = useMemo(
    () => <ReportIntegrityStatusBadge view={live.integrityView} />,
    [live.integrityView],
  );

  const onPreset = useCallback(
    (p: ReportPeriodPreset) => {
      setPreset(p);
      if (p === "custom" && anchor) {
        const end = endOfLocalDay(anchor);
        const start = startOfLocalDay(addDaysLocal(end, -30));
        setCustomFrom(fmtYmd(start));
        setCustomTo(fmtYmd(end));
      }
    },
    [anchor],
  );

  const onHistRev = useCallback(() => {
    setHistRev((v) => v + 1);
  }, []);

  const model = useMemo(() => {
    if (!anchor) return null;
    return buildReportModel({
      anchor,
      preset,
      customFrom: preset === "custom" ? customFrom : undefined,
      customTo: preset === "custom" ? customTo : undefined,
      compareMode,
      attive: live.attive,
      storico: live.storico,
      completate: live.completate,
      manualByMonth: live.manualByMonth,
      magazzino: live.magazzino,
      mezzi: live.mezzi,
      magLog: live.magLog,
      semanticIndex,
      derivedBundle,
    });
  }, [
    anchor,
    preset,
    customFrom,
    customTo,
    compareMode,
    live.attive,
    live.storico,
    live.completate,
    live.manualByMonth,
    live.magazzino,
    live.mezzi,
    live.magLog,
    semanticIndex,
    derivedBundle,
  ]);

  const filterRange = useStableDateRange(model?.range ?? null);

  const tops = useMemo(() => {
    if (!model || !filterRange) return null;
    const mezzi = semanticIndex.topMezzi(filterRange);
    const clienti = semanticIndex.topClienti(filterRange);
    const ricambi = buildTopRicambiPeriodo(derivedBundle.magLogSorted, live.magazzino, filterRange);
    if (!model.compareRange) return { mezzi, clienti, ricambi };
    const r = model.compareRange;
    return {
      mezzi: mergeTopMezziCompare(mezzi, semanticIndex.topMezzi(r)),
      clienti: mergeTopClientiCompare(clienti, semanticIndex.topClienti(r)),
      ricambi: mergeTopRicambiCompare(ricambi, buildTopRicambiPeriodo(derivedBundle.magLogSorted, live.magazzino, r)),
    };
  }, [model, filterRange, semanticIndex, derivedBundle.magLogSorted, live.magazzino]);

  const toolbarProps =
    filterRange && model
      ? {
          titleAddon: integrityBadge,
          preset,
          onPreset,
          customFrom,
          customTo,
          onCustomFrom: setCustomFrom,
          onCustomTo: setCustomTo,
          compareMode,
          onCompareMode: setCompareMode,
          range: filterRange,
          compareRange: model.compareRange,
        }
      : null;

  const renderPhase =
    live.isLoading || !model || !tops || !filterRange || !toolbarProps
      ? "skeleton"
      : live.isError
        ? "error"
        : "full";

  if (live.isLoading || !model || !tops || !filterRange || !toolbarProps) {
    return (
      <div className={dsStackPage}>
        {toolbarProps ? (
          <ReportToolbar {...toolbarProps} />
        ) : (
          <>
            <PageHeader title="Report" titleAddon={integrityBadge} />
          </>
        )}
        <ReportSkeleton />
      </div>
    );
  }

  if (live.isError) {
    return (
      <div className={dsStackPage}>
        <ReportToolbar {...toolbarProps} />
        <ShellCard title="Caricamento non riuscito">
          <LoadingErrorState
            title="Impossibile caricare i dati del report"
            description="Controlla la connessione e riprova."
            onRetry={() => window.location.reload()}
          />
        </ShellCard>
      </div>
    );
  }

  return (
    <div className={dsStackPage}>
      <ReportToolbar {...toolbarProps} />

      <ReportPerformanceGate
        anchor={anchor}
        filterRange={filterRange}
        compareRange={model.compareRange}
        periodKpis={model.kpis}
        live={live}
        semanticIndex={semanticIndex}
      >
        <div className="min-w-0 space-y-4">
          <ReportExecutiveOverview compareMode={compareMode} />
          <ReportTrendsZone filterRange={filterRange} anchor={anchor} semanticIndex={semanticIndex} />
          <ReportOperationalAnalysisZone filterRange={filterRange} />
          <ReportMaintenanceZone
            attive={live.attive}
            completate={live.completate}
            manualEntries={live.manualEntries}
            anchor={anchor}
            filterRange={filterRange}
            compareDetail={model.compareDetail}
            semanticIndex={semanticIndex}
            derivedBundle={derivedBundle}
            prodotti={live.magazzino}
            histRev={histRev}
            onHistRev={onHistRev}
            topsMezzi={tops.mezzi}
            topsClienti={tops.clienti}
            topsRicambi={tops.ricambi}
            showCompare={Boolean(model.compareRange)}
          />
        </div>
      </ReportPerformanceGate>
    </div>
  );
}
