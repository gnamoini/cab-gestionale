"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ShellCard } from "@/components/gestionale/shell-card";
import { ReportDomainSnapshotProvider } from "@/components/report/context/report-domain-snapshot-context";
import { ReportToolbar } from "@/components/report/layout/report-toolbar";
import { ReportSectionVisibilityProvider } from "@/components/report/layout/report-section-visibility-context";
import { ReportIntegrityStatusBadge } from "@/components/report/report-integrity-status-badge";
import { ReportAnalyticsProvider } from "@/components/report/analytics/report-analytics-provider";
import { ReportAskProvider } from "@/components/report/ask-report/report-ask-provider";
import { ReportDrillDownProvider } from "@/components/report/bi-center/report-drill-down-provider";
import { useReportPeriodContext } from "@/components/report/context/report-period-context";
import { buildReportModel } from "@/lib/report/build-report-model";
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
import { useGestionaleSyncScope } from "@/src/hooks/gestionale/use-gestionale-sync-scope";
import { LoadingErrorState } from "@/components/design-system";
import { ReportPageStructure } from "@/components/report/report-page-structure";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import { useSchedeBundlesQuery } from "@/src/hooks/use-schede-store-query";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";
import type { ReportHubAreaId } from "@/lib/report/report-hub-areas-config";

/** Heavy BI data shell — only mounted under /report/(areas)/*, not on hub. */
export function ReportAreaDataShell({
  areaId,
  children,
  showAskButton = true,
}: {
  areaId: ReportHubAreaId;
  children: ReactNode;
  showAskButton?: boolean;
}) {
  useGestionaleSyncScope({
    scopeId: `report-area-${areaId}`,
    domain: "report",
    route: `/report/${areaId}`,
    tables: ["lavorazioni", "magazzino_ricambi", "movimenti_ricambi", "mezzi", "app_settings"],
  });

  const period = useReportPeriodContext();
  const [histRev, setHistRev] = useState(0);

  const live = useReportLiveData({
    enableMezzi: true,
    enableMovimenti: true,
    enableManual: true,
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
  const { store: schedeStore } = useSchedeBundlesQuery(!live.isLoading, {
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

  const onHistRev = useCallback(() => {
    setHistRev((v) => v + 1);
  }, []);

  const model = useMemo(() => {
    return buildReportModel({
      anchor: period.anchor,
      preset: period.preset,
      customFrom: period.preset === "custom" ? period.customFrom : undefined,
      customTo: period.preset === "custom" ? period.customTo : undefined,
      compareMode: period.compareMode,
      compareCustomFrom: period.compareMode === "custom_range" ? period.compareCustomFrom : undefined,
      compareCustomTo: period.compareMode === "custom_range" ? period.compareCustomTo : undefined,
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
    period.anchor,
    period.preset,
    period.customFrom,
    period.customTo,
    period.compareMode,
    period.compareCustomFrom,
    period.compareCustomTo,
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

  const tops = useMemo(() => {
    const filterRange = period.range;
    const mezzi = semanticIndex.topMezzi(filterRange);
    const clienti = semanticIndex.topClienti(filterRange);
    const ricambi = buildTopRicambiPeriodo(derivedBundle.magLogSorted, live.magazzino, filterRange);
    if (!period.compareRange) return { mezzi, clienti, ricambi };
    const r = period.compareRange;
    const ctx = { curRange: filterRange, compareRange: r, compareMode: period.compareMode };
    return {
      mezzi: mergeTopMezziCompare(mezzi, semanticIndex.topMezzi(r), ctx),
      clienti: mergeTopClientiCompare(clienti, semanticIndex.topClienti(r), ctx),
      ricambi: mergeTopRicambiCompare(
        ricambi,
        buildTopRicambiPeriodo(derivedBundle.magLogSorted, live.magazzino, r),
        ctx,
      ),
    };
  }, [
    period.compareRange,
    period.compareMode,
    period.range,
    semanticIndex,
    derivedBundle.magLogSorted,
    live.magazzino,
  ]);

  const domainSnapshot = useMemo(
    () => ({
      range: period.range,
      compareRange: period.compareRange,
      anchor: period.anchor,
      showCompare: period.showCompare,
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
      rangeKey: period.rangeKey,
      derivedBundle,
      magazzino: live.magazzino,
      mezzi: live.mezzi,
      lavListRows: live.lavListRows,
      histRev,
      onHistRev,
      tops,
    }),
    [
      period.range,
      period.compareRange,
      period.anchor,
      period.showCompare,
      period.rangeKey,
      live.attive,
      live.storico,
      live.completate,
      live.manualByMonth,
      live.magLog,
      magazzinoRows,
      costoOrario,
      schedeStore,
      semanticIndex,
      model.compareDetail,
      derivedBundle,
      live.magazzino,
      live.mezzi,
      live.lavListRows,
      histRev,
      onHistRev,
      tops,
    ],
  );

  const toolbarProps = {
    areaId,
    integrityBadge,
    showAskButton,
    preset: period.preset,
    onPreset: period.setPreset,
    customFrom: period.customFrom,
    customTo: period.customTo,
    onCustomFrom: period.setCustomFrom,
    onCustomTo: period.setCustomTo,
    compareMode: period.compareMode,
    onCompareMode: period.setCompareMode,
    compareCustomFrom: period.compareCustomFrom,
    compareCustomTo: period.compareCustomTo,
    onCompareCustomFrom: period.setCompareCustomFrom,
    onCompareCustomTo: period.setCompareCustomTo,
    range: period.range,
    compareRange: period.compareRange,
  };

  if (live.isLoading) {
    return (
      <>
        <ReportToolbar {...toolbarProps} />
        <ReportPageStructure mode="skeleton" scope="content" />
      </>
    );
  }

  if (live.isError) {
    return (
      <>
        <ReportToolbar {...toolbarProps} showAskButton={false} />
        <ShellCard title="Caricamento non riuscito">
          <LoadingErrorState
            title="Impossibile caricare i dati del report"
            description="Controlla la connessione e riprova."
            onRetry={() => window.location.reload()}
          />
        </ShellCard>
      </>
    );
  }

  return (
    <ReportAnalyticsProvider>
      <ReportAskProvider>
        <ReportToolbar {...toolbarProps} />
        <ReportSectionVisibilityProvider>
          <ReportDrillDownProvider>
            <ReportDomainSnapshotProvider value={domainSnapshot}>{children}</ReportDomainSnapshotProvider>
          </ReportDrillDownProvider>
        </ReportSectionVisibilityProvider>
      </ReportAskProvider>
    </ReportAnalyticsProvider>
  );
}
