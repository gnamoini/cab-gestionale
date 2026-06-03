"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { useUIAutonomyFixEngine } from "@/lib/ui-autonomy-fix/use-ui-autonomy-fix-engine";
import { PageHeader } from "@/components/gestionale/page-header";
import { ShellCard } from "@/components/gestionale/shell-card";
import { ReportComplianceZone } from "@/components/report/layout/report-compliance-zone";
import { ReportEconomicZone } from "@/components/report/layout/report-economic-zone";
import { ReportExecutiveOverview } from "@/components/report/layout/report-executive-overview";
import { ReportFleetZone } from "@/components/report/layout/report-fleet-zone";
import { ReportMaintenanceZone } from "@/components/report/layout/report-maintenance-zone";
import { ReportOperationsZone } from "@/components/report/layout/report-operations-zone";
import { ReportPerformanceGate } from "@/components/report/layout/report-performance-gate";
import { ReportTeamTimesheetZone } from "@/components/report/layout/report-team-timesheet-zone";
import { ReportToolbar } from "@/components/report/layout/report-toolbar";
import { ReportZoneNav } from "@/components/report/layout/report-zone-nav";
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

function useClientMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ReportAnalyticsView() {
  const mounted = useClientMounted();
  const anchor = useMemo(() => (mounted ? new Date() : null), [mounted]);
  const [preset, setPreset] = useState<ReportPeriodPreset>("last_3_months");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [compareMode, setCompareMode] = useState<ReportCompareMode>("none");
  const [histRev, setHistRev] = useState(0);
  useUIAutonomyFixEngine("/report", [preset, compareMode, histRev]);

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
    anchor && filterRange && model
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

  if (!mounted || !anchor || live.isLoading || !model || !tops || !filterRange || !toolbarProps) {
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
      <ReportZoneNav />

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
          <ReportOperationsZone filterRange={filterRange} anchor={anchor} semanticIndex={semanticIndex} />
          <ReportFleetZone />
          <ReportEconomicZone />
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
          <ReportComplianceZone />
          <ReportTeamTimesheetZone filterRange={filterRange} />
        </div>
      </ReportPerformanceGate>
    </div>
  );
}
