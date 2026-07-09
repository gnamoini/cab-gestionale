"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useUIAutonomyFixEngine } from "@/lib/ui-autonomy-fix/use-ui-autonomy-fix-engine";
import { PageHeader } from "@/components/gestionale/page-header";
import { ShellCard } from "@/components/gestionale/shell-card";
import {
  ReportPerformanceGate,
  useReportPerformanceContext,
} from "@/components/report/layout/report-performance-gate";
import { ReportSections } from "@/components/report/layout/report-sections";
import { ReportToolbar } from "@/components/report/layout/report-toolbar";
import { ReportAnalyticsDerivedProvider } from "@/components/report/report-analytics-derived-context";
import {
  ReportSectionVisibilityProvider,
  useReportSectionVisibility,
} from "@/components/report/layout/report-section-visibility-context";
import { useReportDerivedPrefetch } from "@/components/report/use-report-derived-prefetch";
import { ReportIntegrityStatusBadge } from "@/components/report/report-integrity-status-badge";
import type { DomainReportSectionProps, ReportAiSectionProps } from "@/components/report/report-section-types";
import { buildReportModel } from "@/lib/report/build-report-model";
import { buildReportRangeKey } from "@/lib/report/report-domain-types";
import {
  endOfLocalDay,
  startOfLocalDay,
  type ReportCompareMode,
  type ReportPeriodPreset,
} from "@/lib/report/date-ranges";
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
import { isReportCompareMode } from "@/lib/report/report-compare-options";
import { useReportLiveData } from "@/lib/report/use-report-live-data";
import { LoadingErrorState, LoadingReportSkeleton } from "@/components/design-system";
import { dsStackPage } from "@/lib/ui/design-system";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import { useSchedeBundlesQuery } from "@/src/hooks/use-schede-store-query";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

function fmtYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDaysLocal(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12, 0, 0, 0);
}

function useStableDateRange(range: DateRange | null | undefined): DateRange | null {
  const startMs = range?.start.getTime();
  const endMs = range?.end.getTime();
  return useMemo(() => {
    if (startMs == null || endMs == null) return null;
    return { start: new Date(startMs), end: new Date(endMs) };
  }, [startMs, endMs]);
}

function readInitialPeriodPrefs(searchParams: URLSearchParams | null): {
  preset: ReportPeriodPreset;
  compareMode: ReportCompareMode;
  customFrom: string;
  customTo: string;
  compareCustomFrom: string;
  compareCustomTo: string;
} {
  const defaults = {
    preset: "last_3_months" as ReportPeriodPreset,
    compareMode: "none" as ReportCompareMode,
    customFrom: "",
    customTo: "",
    compareCustomFrom: "",
    compareCustomTo: "",
  };

  const fromUrl = searchParams?.get("from")?.trim() ?? "";
  const toUrl = searchParams?.get("to")?.trim() ?? "";
  const presetUrl = searchParams?.get("preset")?.trim() ?? "";
  const compareUrl = searchParams?.get("compare")?.trim() ?? "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(fromUrl) && /^\d{4}-\d{2}-\d{2}$/.test(toUrl)) {
    const compareMode = isReportCompareMode(compareUrl) ? compareUrl : ("none" as ReportCompareMode);
    return {
      preset: "custom",
      compareMode,
      customFrom: fromUrl,
      customTo: toUrl,
      compareCustomFrom: "",
      compareCustomTo: "",
    };
  }

  if (presetUrl === "current_week" && /^\d{4}-\d{2}-\d{2}$/.test(fromUrl)) {
    return {
      preset: "custom",
      compareMode: isReportCompareMode(compareUrl) ? compareUrl : "none",
      customFrom: fromUrl,
      customTo: toUrl || fromUrl,
      compareCustomFrom: "",
      compareCustomTo: "",
    };
  }

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
    compareCustomFrom: saved.compareCustomFrom ?? "",
    compareCustomTo: saved.compareCustomTo ?? "",
  };
}

function ReportSectionsWithContext({
  compareMode,
  domainBase,
  aiProps,
}: {
  compareMode: ReportCompareMode;
  domainBase: Omit<DomainReportSectionProps, "analyticsContext" | "sectionId" | "fetchEnabled">;
  aiProps: ReportAiSectionProps;
}) {
  const { perf, perfLoading, partitioned } = useReportPerformanceContext();
  const domainProps: DomainReportSectionProps = {
    ...domainBase,
    sectionId: "lavorazioni",
    fetchEnabled: false,
    analyticsContext: { perf, perfLoading, partitioned, compareMode },
  };
  useReportDerivedPrefetch(domainProps);
  return <ReportSections domainProps={domainProps} aiProps={aiProps} />;
}

function ReportPerformanceGateWithVisibility(
  props: ComponentProps<typeof ReportPerformanceGate> & { children: ReactNode },
) {
  const { perfGateEnabled } = useReportSectionVisibility();
  return <ReportPerformanceGate {...props} enabled={perfGateEnabled} />;
}

export function ReportAnalyticsView() {
  const searchParams = useSearchParams();
  const anchor = useMemo(() => new Date(), []);
  const [initialPrefs] = useState(() => readInitialPeriodPrefs(searchParams));
  const [preset, setPreset] = useState<ReportPeriodPreset>(initialPrefs.preset);
  const [customFrom, setCustomFrom] = useState(initialPrefs.customFrom);
  const [customTo, setCustomTo] = useState(initialPrefs.customTo);
  const [compareMode, setCompareMode] = useState<ReportCompareMode>(initialPrefs.compareMode);
  const [compareCustomFrom, setCompareCustomFrom] = useState(initialPrefs.compareCustomFrom);
  const [compareCustomTo, setCompareCustomTo] = useState(initialPrefs.compareCustomTo);
  const [histRev, setHistRev] = useState(0);
  useUIAutonomyFixEngine("/report", [preset, compareMode, histRev]);

  useEffect(() => {
    saveReportPeriodPrefs({
      preset,
      compareMode,
      customFrom,
      customTo,
      compareCustomFrom,
      compareCustomTo,
    });
  }, [preset, compareMode, customFrom, customTo, compareCustomFrom, compareCustomTo]);

  const onCompareMode = useCallback((m: ReportCompareMode) => {
    setCompareMode(m);
    if (m !== "custom_range") {
      setCompareCustomFrom("");
      setCompareCustomTo("");
    }
  }, []);

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
  const schedeLavorazioneIds = useMemo(() => live.lavListRows.map((row) => row.id), [live.lavListRows]);
  const { store: schedeStore, isLoading: schedeLoading } = useSchedeBundlesQuery(!live.isLoading, {
    lavorazioneIds: schedeLavorazioneIds,
  });
  const settingsQ = useCabAppSettingsPayloadQuery({ tier: "static" });
  const costoOrario = useMemo(() => {
    const v = settingsQ.data?.resolved?.preventiviDefaults?.costoOrarioDefault;
    return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 48;
  }, [settingsQ.data]);

  const magazzinoRows = useMemo((): MagazzinoRicambioRow[] => {
    return live.magazzino.map((p) => ({
      id: p.id,
      costo: p.prezzoFornitoreOriginale,
    })) as MagazzinoRicambioRow[];
  }, [live.magazzino]);

  const integrityBadge = useMemo(
    () => <ReportIntegrityStatusBadge view={live.integrityView} />,
    [live.integrityView],
  );

  const onPreset = useCallback(
    (p: ReportPeriodPreset) => {
      setPreset(p);
      if (p === "custom" && anchor && !customFrom.trim() && !customTo.trim()) {
        const end = endOfLocalDay(anchor);
        const start = startOfLocalDay(addDaysLocal(end, -30));
        setCustomFrom(fmtYmd(start));
        setCustomTo(fmtYmd(end));
      }
    },
    [anchor, customFrom, customTo],
  );

  const onHistRev = useCallback(() => {
    setHistRev((v) => v + 1);
  }, []);

  const model = useMemo(() => {
    return buildReportModel({
      anchor,
      preset,
      customFrom: preset === "custom" ? customFrom : undefined,
      customTo: preset === "custom" ? customTo : undefined,
      compareMode,
      compareCustomFrom: compareMode === "custom_range" ? compareCustomFrom : undefined,
      compareCustomTo: compareMode === "custom_range" ? compareCustomTo : undefined,
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
    compareCustomFrom,
    compareCustomTo,
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

  const filterRange = useStableDateRange(model.range);
  const rangeKey = useMemo(
    () => buildReportRangeKey(filterRange!, model.compareRange),
    [filterRange, model.compareRange],
  );

  const tops = useMemo(() => {
    if (!filterRange) return null;
    const mezzi = semanticIndex.topMezzi(filterRange);
    const clienti = semanticIndex.topClienti(filterRange);
    const ricambi = buildTopRicambiPeriodo(derivedBundle.magLogSorted, live.magazzino, filterRange);
    if (!model.compareRange) return { mezzi, clienti, ricambi };
    const r = model.compareRange;
    const ctx = { curRange: filterRange, compareRange: r, compareMode };
    return {
      mezzi: mergeTopMezziCompare(mezzi, semanticIndex.topMezzi(r), ctx),
      clienti: mergeTopClientiCompare(clienti, semanticIndex.topClienti(r), ctx),
      ricambi: mergeTopRicambiCompare(
        ricambi,
        buildTopRicambiPeriodo(derivedBundle.magLogSorted, live.magazzino, r),
        ctx,
      ),
    };
  }, [model.compareRange, compareMode, filterRange, semanticIndex, derivedBundle.magLogSorted, live.magazzino]);

  const toolbarProps = filterRange
    ? {
        titleAddon: integrityBadge,
        preset,
        onPreset,
        customFrom,
        customTo,
        onCustomFrom: setCustomFrom,
        onCustomTo: setCustomTo,
        compareMode,
        onCompareMode,
        compareCustomFrom,
        compareCustomTo,
        onCompareCustomFrom: setCompareCustomFrom,
        onCompareCustomTo: setCompareCustomTo,
        range: filterRange,
        compareRange: model.compareRange,
      }
    : null;

  if (live.isLoading || !tops || !filterRange || !toolbarProps) {
    return (
      <div className={`${dsStackPage} ${layoutPageRoot} min-w-0 max-w-full`}>
        {toolbarProps ? <ReportToolbar {...toolbarProps} /> : <PageHeader title="Report" titleAddon={integrityBadge} />}
        <LoadingReportSkeleton />
      </div>
    );
  }

  if (live.isError) {
    return (
      <div className={`${dsStackPage} ${layoutPageRoot} min-w-0 max-w-full`}>
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

  const domainBase: Omit<DomainReportSectionProps, "analyticsContext" | "sectionId" | "fetchEnabled"> = {
    range: filterRange,
    compareRange: model.compareRange,
    rangeKey,
    anchor,
    compareDetail: model.compareDetail,
    semanticIndex,
    derivedBundle,
    attive: live.attive,
    storico: live.storico,
    completate: live.completate,
    manualEntries: live.manualEntries,
    prodotti: live.magazzino,
    histRev,
    onHistRev,
    topsMezzi: tops.mezzi,
    topsClienti: tops.clienti,
    topsRicambi: tops.ricambi,
    showCompare: Boolean(model.compareRange),
    manualByMonth: live.manualByMonth,
    lavListRows: live.lavListRows,
    magLog: live.magLog,
    magazzinoRows,
    costoOrario,
    schedeStore,
    schedeLoaded: !schedeLoading,
  };

  const aiProps: ReportAiSectionProps = {
    preset,
    compareMode,
    filterRange,
    compareRange: model.compareRange,
    model,
    integrityView: live.integrityView,
    tops,
    snapshotFingerprint: live.snapshotFingerprint,
  };

  return (
    <div className={`${dsStackPage} ${layoutPageRoot} min-w-0 max-w-full`}>
      <ReportToolbar {...toolbarProps} />

      <ReportAnalyticsDerivedProvider rangeKey={rangeKey}>
        <ReportSectionVisibilityProvider>
          <ReportPerformanceGateWithVisibility
            anchor={anchor}
            filterRange={filterRange}
            compareRange={model.compareRange}
            compareMode={compareMode}
            periodKpis={model.kpis}
            live={live}
            semanticIndex={semanticIndex}
          >
            <ReportSectionsWithContext compareMode={compareMode} domainBase={domainBase} aiProps={aiProps} />
          </ReportPerformanceGateWithVisibility>
        </ReportSectionVisibilityProvider>
      </ReportAnalyticsDerivedProvider>
    </div>
  );
}
