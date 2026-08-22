"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useUIAutonomyFixEngine } from "@/lib/ui-autonomy-fix/use-ui-autonomy-fix-engine";
import { ShellCard } from "@/components/gestionale/shell-card";
import { ReportDomainSnapshotProvider } from "@/components/report/context/report-domain-snapshot-context";
import { ReportToolbar } from "@/components/report/layout/report-toolbar";
import {
  ReportSectionVisibilityProvider,
} from "@/components/report/layout/report-section-visibility-context";
import { ReportIntegrityStatusBadge } from "@/components/report/report-integrity-status-badge";
import { ReportPeriodContextProvider } from "@/components/report/context/report-period-context";
import { ReportAnalyticsProvider } from "@/components/report/analytics/report-analytics-provider";
import { ReportAskProvider } from "@/components/report/ask-report/report-ask-provider";
import { ReportAskToolbarButton } from "@/components/report/ask-report/report-ask-toolbar-button";
import { ReportDrillDownProvider } from "@/components/report/bi-center/report-drill-down-provider";
import { ReportBiCenterMount } from "@/components/report/bi-center/report-bi-center-mount";
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
import { useGestionaleSyncScope } from "@/src/hooks/gestionale/use-gestionale-sync-scope";
import { LoadingErrorState } from "@/components/design-system";
import { ReportPageStructure } from "@/components/report/report-page-structure";
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

export function ReportAnalyticsView() {
  useGestionaleSyncScope({
    scopeId: "report-analytics-view",
    domain: "report",
    route: "/report",
    tables: [
      "lavorazioni",
      "magazzino_ricambi",
      "movimenti_ricambi",
      "mezzi",
      "app_settings",
    ],
  });

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

  const live = useReportLiveData({
    enableMezzi: false,
    enableMovimenti: false,
    enableManual: false,
  });

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
    if (!toolbarProps) {
      return <ReportPageStructure mode="skeleton" scope="content" />;
    }
    return (
      <div className={`${dsStackPage} ${layoutPageRoot} min-w-0 max-w-full`}>
        <ReportToolbar {...toolbarProps} />
        <ReportPageStructure mode="skeleton" scope="content" />
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

  const periodContextValue = useMemo(
    () => ({
      anchor,
      preset,
      customFrom,
      customTo,
      compareMode,
      compareCustomFrom,
      compareCustomTo,
      range: filterRange!,
      compareRange: model.compareRange,
      rangeKey,
      showCompare: Boolean(model.compareRange),
      setPreset: onPreset,
      setCustomFrom,
      setCustomTo,
      setCompareMode: onCompareMode,
      setCompareCustomFrom,
      setCompareCustomTo,
    }),
    [
      anchor,
      preset,
      customFrom,
      customTo,
      compareMode,
      compareCustomFrom,
      compareCustomTo,
      filterRange,
      model.compareRange,
      rangeKey,
      onPreset,
      onCompareMode,
    ],
  );

  const domainSnapshot = useMemo(
    () => ({
      range: filterRange!,
      compareRange: model.compareRange,
      anchor,
      showCompare: Boolean(model.compareRange),
      attive: live.attive,
      storico: live.storico,
      completate: live.completate,
      manualByMonth: live.manualByMonth,
      magazzinoRows,
      magLog: live.magLog,
      costoOrario,
      schedeStore,
      semanticIndex,
      compareDetail: model.compareDetail,
      rangeKey,
    }),
    [
      filterRange,
      model.compareRange,
      model.compareDetail,
      anchor,
      live.attive,
      live.storico,
      live.completate,
      live.manualByMonth,
      live.magLog,
      magazzinoRows,
      costoOrario,
      schedeStore,
      semanticIndex,
      rangeKey,
    ],
  );

  return (
    <div className={`${dsStackPage} ${layoutPageRoot} min-w-0 max-w-full`}>
      <ReportPeriodContextProvider value={periodContextValue}>
        <ReportAnalyticsProvider>
          <ReportAskProvider>
            <ReportToolbar
              {...toolbarProps}
              titleAddon={
                <>
                  {toolbarProps.titleAddon}
                  <ReportAskToolbarButton />
                </>
              }
            />
            <ReportSectionVisibilityProvider>
              <ReportDrillDownProvider>
                <ReportDomainSnapshotProvider value={domainSnapshot}>
                  <ReportBiCenterMount filterRange={filterRange} compareMode={compareMode} />
                </ReportDomainSnapshotProvider>
              </ReportDrillDownProvider>
            </ReportSectionVisibilityProvider>
          </ReportAskProvider>
        </ReportAnalyticsProvider>
      </ReportPeriodContextProvider>
    </div>
  );
}
