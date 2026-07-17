"use client";

import { useMemo } from "react";
import { isStagingPublicSlice } from "@/lib/env/staging-public";
import { moduleAllows } from "@/src/lib/auth/effective-module-access";
import { GESTIONALE_CORE_STALE_MS, GESTIONALE_LOG_FEED_LIMIT } from "@/lib/react-query/query-layer-policies";
import {
  buildControlTowerHeaderKpiSlice,
  composeControlTowerSlices,
  filterControlTowerKpiClusters,
  pickLavorazioneIdsFromActivityLogs,
} from "@/lib/dashboard/control-tower-selectors";
import { getControlTowerBriefDataFetchRange } from "@/lib/dashboard/control-tower-time-ranges";
import { movimentiRowsToMagazzinoChangeLog } from "@/lib/report/report-movimenti-log";
import { filterMovimentiForReport } from "@/lib/report/report-truth-dataset";
import { resolveVisibleDashboardWidgets } from "@/lib/dashboard/dashboard-widget-registry";
import { useDashboardMetrics } from "@/src/hooks/view/use-dashboard-metrics";
import { useDashboardHeaderKpiQueries } from "@/lib/dashboard/use-dashboard-header-kpi-queries";
import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";
import { useLogListQuery, useMovimentiListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";
import { isRbacSnapshotReady, snapshotCanReadPage } from "@/src/lib/rbac/rbac-snapshot-access";
import { useViewQueryOpts } from "@/lib/view/view-query-opts";
import { QK } from "@/src/lib/react-query/query-keys";
import { resolveMagazzinoReportLogEntries } from "@/lib/report/resolve-magazzino-report-log";
import { isLavorazioneInCorso } from "@/lib/lavorazioni/archived";
import {
  pickDashboardPriorityLavorazioneIds,
  DASHBOARD_SCHEde_PREFETCH_LIMIT,
} from "@/lib/view/dashboard-widgets-selectors";
import { useSchedeBundlesQuery } from "@/src/hooks/use-schede-store-query";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { dipendentiTimesheetEntry } from "@/lib/domain/dipendenti-timesheet-entry";
import type { DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";
import type { DashboardMagMovementRow } from "@/lib/view/dashboard-widgets-selectors";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { EffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/types";
import type { DashboardWidgetDefinition } from "@/lib/dashboard/dashboard-widget-registry";
import type { LogModificaRow, LogModificaWithProfileRow } from "@/src/types/supabase-tables";
import { ymdFromDate } from "@/lib/report/date-ranges";

export type ControlTowerDashSlice = {
  globalOpts: ReturnType<typeof useGlobalOptions>;
  lavRows: readonly LavorazioneListRow[];
  ricambi: readonly RicambioMagazzino[];
  magRecentMovements: readonly DashboardMagMovementRow[];
  magLogs: readonly LogModificaRow[];
  movLogs: readonly LogModificaRow[];
  isLoading: boolean;
};

export function controlTowerDashSliceFromMetrics(
  dash: ReturnType<typeof useDashboardMetrics>,
): ControlTowerDashSlice {
  return {
    globalOpts: dash.globalOpts,
    lavRows: dash.lavReportRows,
    ricambi: dash.magQuery.data ?? [],
    magRecentMovements: dash.magRecentMovements,
    magLogs: dash.magLogs,
    movLogs: dash.movLogs,
    isLoading: dash.isLoading,
  };
}

/** Fallback when no dashboard widgets are visible — no lav/mag fetch. */
export function controlTowerEmptyDashSlice(
  globalOpts: ReturnType<typeof useGlobalOptions>,
): ControlTowerDashSlice {
  return {
    globalOpts,
    lavRows: [],
    ricambi: [],
    magRecentMovements: [],
    magLogs: [],
    movLogs: [],
    isLoading: false,
  };
}

export type ControlTowerHeaderKpiBase = {
  input: Parameters<typeof buildControlTowerHeaderKpiSlice>[0];
  filter: {
    lavorazioni: boolean;
    magazzino: boolean;
    admin: boolean;
    dipendenti: boolean;
  };
};

export type ControlTowerShell = {
  staging: boolean;
  rbacLoading: boolean;
  modules: EffectivePermissionsSnapshot["modules"] | undefined;
  visibleWidgets: DashboardWidgetDefinition[];
  visibleIds: Set<string>;
  canLavorazioni: boolean;
  canMagazzino: boolean;
  canPreventivi: boolean;
  canFatturazione: boolean;
  canDdt: boolean;
  canDipendenti: boolean;
  canReadDipendentiPage: boolean;
  activityVisible: boolean;
  headerVisible: boolean;
  globalOpts: ReturnType<typeof useGlobalOptions>;
  dipendentiOpts: ReturnType<typeof useGlobalOptions>["dipendenti"];
};

export function useControlTowerShell(): ControlTowerShell {
  const staging = isStagingPublicSlice();
  const { snapshot, isLoading: rbacLoading } = useEffectivePermissions();
  const modules = snapshot?.modules;
  const globalOpts = useGlobalOptions({ debugTag: "useControlTowerMetrics" });
  const { dipendenti: dipendentiOpts } = globalOpts;

  const visibleWidgets = useMemo(
    () => (modules ? resolveVisibleDashboardWidgets({ modules, staging }) : []),
    [modules, staging],
  );
  const visibleIds = useMemo(() => new Set(visibleWidgets.map((w) => w.id)), [visibleWidgets]);
  const canReadDipendentiPage =
    snapshot != null && isRbacSnapshotReady(snapshot) && snapshotCanReadPage(snapshot, "dipendenti");

  return {
    staging,
    rbacLoading,
    modules,
    visibleWidgets,
    visibleIds,
    canLavorazioni: modules ? moduleAllows(modules, "lavorazioni", "read") : false,
    canMagazzino: modules ? moduleAllows(modules, "magazzino", "read") : false,
    canPreventivi: modules ? moduleAllows(modules, "preventivi", "read") : false,
    canFatturazione: modules ? moduleAllows(modules, "fatturazione", "read") : false,
    canDdt: modules ? moduleAllows(modules, "ddt", "read") : false,
    canDipendenti: modules ? moduleAllows(modules, "dipendenti", "read") : false,
    canReadDipendentiPage,
    activityVisible: visibleIds.has("recent-activity"),
    headerVisible: visibleIds.has("operational-kpi-header"),
    globalOpts,
    dipendentiOpts,
  };
}

export function useControlTowerMetricsValue(shell: ControlTowerShell, dash: ControlTowerDashSlice) {
  const viewOpts = useViewQueryOpts();
  const gestOpts = useGestionaleQueryOpts();
  const logQueryOpts = { ...gestOpts, ...viewOpts };
  const activityLogQueryOpts = {
    ...logQueryOpts,
    staleTime: GESTIONALE_CORE_STALE_MS,
    refetchOnWindowFocus: true,
  };
  const {
    staging,
    rbacLoading,
    modules,
    visibleWidgets,
    canLavorazioni,
    canMagazzino,
    canPreventivi,
    canFatturazione,
    canDdt,
    canDipendenti,
    canReadDipendentiPage,
    activityVisible,
    headerVisible,
    visibleIds,
    dipendentiOpts,
  } = shell;

  const needAdminData =
    !staging && headerVisible && (canPreventivi || canFatturazione);
  const { preventiviQ, invoicesQ } = useDashboardHeaderKpiQueries({
    enabled: !staging && headerVisible,
    canPreventivi,
    canFatturazione,
  });

  const activityEnabled = !staging && activityVisible;

  const lavLogsQ = useLogListQuery(
    { entita: "lavorazioni", limit: GESTIONALE_LOG_FEED_LIMIT },
    { enabled: activityEnabled && canLavorazioni, ...activityLogQueryOpts },
  );
  const schedeLogsQ = useLogListQuery(
    { entita: "scheda_lavorazione", limit: GESTIONALE_LOG_FEED_LIMIT },
    { enabled: activityEnabled && canLavorazioni, ...activityLogQueryOpts },
  );
  const magLogsQ = useLogListQuery(
    { entita: "magazzino_ricambi", limit: GESTIONALE_LOG_FEED_LIMIT },
    { enabled: activityEnabled && canMagazzino, ...activityLogQueryOpts },
  );
  const movLogsQ = useLogListQuery(
    { entita: "movimenti_ricambi", limit: GESTIONALE_LOG_FEED_LIMIT },
    { enabled: activityEnabled && canMagazzino, ...activityLogQueryOpts },
  );
  const preventiviLogsQ = useLogListQuery(
    { entita: "preventivi", limit: GESTIONALE_LOG_FEED_LIMIT },
    { enabled: activityEnabled && canPreventivi, ...activityLogQueryOpts },
  );
  const invoicesLogsQ = useLogListQuery(
    { entita: "invoices", limit: GESTIONALE_LOG_FEED_LIMIT },
    { enabled: activityEnabled && canFatturazione, ...activityLogQueryOpts },
  );
  const invoicePaymentsLogsQ = useLogListQuery(
    { entita: "invoice_payments", limit: GESTIONALE_LOG_FEED_LIMIT },
    { enabled: activityEnabled && canFatturazione, ...activityLogQueryOpts },
  );
  const ddtLogsQ = useLogListQuery(
    { entita: "ddt_documents", limit: GESTIONALE_LOG_FEED_LIMIT },
    { enabled: activityEnabled && canDdt, ...activityLogQueryOpts },
  );

  const timesheetRange = useMemo(() => {
    const fetch = getControlTowerBriefDataFetchRange();
    return { from: ymdFromDate(fetch.start), to: ymdFromDate(fetch.end) };
  }, []);

  const needTimesheet = !staging && headerVisible && !rbacLoading && canReadDipendentiPage;
  const needMovimenti = !staging && headerVisible && canMagazzino;
  const timesheetQ = useServiceQuery(
    [...QK.dipendentiTimesheetEntries, "control-tower", timesheetRange.from, timesheetRange.to] as const,
    () => dipendentiTimesheetEntry.listEntriesForRange(timesheetRange.from, timesheetRange.to),
    { enabled: needTimesheet, ...viewOpts },
  );
  const movimentiQ = useMovimentiListQuery(undefined, {
    enabled: needMovimenti,
    ...viewOpts,
  });

  const magLogFromLogs = useMemo(
    () => resolveMagazzinoReportLogEntries([], dash.magLogs as LogModificaWithProfileRow[]),
    [dash.magLogs],
  );

  const magLog = useMemo(() => {
    const movimentiRows = movimentiQ.data ?? [];
    if (movimentiRows.length > 0) {
      const validRicambioIds = new Set(dash.ricambi.map((r) => r.id));
      const validLavorazioneIds = new Set(dash.lavRows.map((r) => r.id));
      const { rows } = filterMovimentiForReport(movimentiRows, validRicambioIds, validLavorazioneIds);
      if (rows.length > 0) return movimentiRowsToMagazzinoChangeLog(rows);
    }
    return magLogFromLogs;
  }, [movimentiQ.data, dash.ricambi, dash.lavRows, magLogFromLogs]);

  const useMovimentiMagLog = (movimentiQ.data?.length ?? 0) > 0 && magLog.length > 0;

  const activityLogRows = useMemo(
    () => [...(lavLogsQ.data ?? []), ...(schedeLogsQ.data ?? [])],
    [lavLogsQ.data, schedeLogsQ.data],
  );

  const schedeIds = useMemo(() => {
    const fromActivity = pickLavorazioneIdsFromActivityLogs(activityLogRows, DASHBOARD_SCHEde_PREFETCH_LIMIT);
    if (fromActivity.length > 0) return fromActivity;
    return pickDashboardPriorityLavorazioneIds(
      dash.lavRows.filter((r) => !r.deleted_at && isLavorazioneInCorso(r)),
      DASHBOARD_SCHEde_PREFETCH_LIMIT,
    );
  }, [activityLogRows, dash.lavRows]);
  const needSchede = !staging && activityVisible && canLavorazioni;
  const { store: schedeStore } = useSchedeBundlesQuery(needSchede, { lavorazioneIds: schedeIds });

  const headerKpiBase = useMemo((): ControlTowerHeaderKpiBase | null => {
    if (!modules || !headerVisible) return null;
    return {
      input: {
        lavRows: dash.lavRows,
        ricambi: dash.ricambi,
        movimentiLogs: useMovimentiMagLog ? [] : dash.movLogs,
        magLog,
        preventivi: preventiviQ.records,
        invoices: invoicesQ.invoices,
        timesheetEntries: (timesheetQ.data ?? []) as DipendenteTimesheetEntryRow[],
        tipiAssenza: dipendentiOpts.tipiAssenza,
        includeLavorazioni: canLavorazioni,
        includeMagazzino: canMagazzino,
        includeAdmin: needAdminData,
        includeDipendenti: needTimesheet,
      },
      filter: {
        lavorazioni: canLavorazioni,
        magazzino: canMagazzino,
        admin: needAdminData,
        dipendenti: canDipendenti,
      },
    };
  }, [
    modules,
    headerVisible,
    dash.lavRows,
    dash.ricambi,
    dash.movLogs,
    magLog,
    useMovimentiMagLog,
    movimentiQ.data,
    preventiviQ.records,
    invoicesQ.invoices,
    timesheetQ.data,
    dipendentiOpts.tipiAssenza,
    canLavorazioni,
    canMagazzino,
    needAdminData,
    needTimesheet,
    canDipendenti,
  ]);

  const slices = useMemo(() => {
    if (!modules) return null;
    const composed = composeControlTowerSlices({
      lavRows: dash.lavRows,
      schedeStore,
      ricambi: dash.ricambi,
      magMovements: dash.magRecentMovements,
      magLog,
      movimentiLogs: useMovimentiMagLog ? [] : dash.movLogs,
      preventivi: preventiviQ.records,
      invoices: invoicesQ.invoices,
      logLavorazioni: activityLogRows,
      logMagazzino: magLogsQ.data ?? [],
      logMovimenti: movLogsQ.data ?? [],
      logPreventivi: preventiviLogsQ.data ?? [],
      logDdt: ddtLogsQ.data ?? [],
      logFatturazione: [...(invoicesLogsQ.data ?? []), ...(invoicePaymentsLogsQ.data ?? [])],
      timesheetEntries: (timesheetQ.data ?? []) as DipendenteTimesheetEntryRow[],
      tipiAssenza: dipendentiOpts.tipiAssenza,
      statiLavorazione: dash.globalOpts.lavorazioni.stati,
      agendaSessions: [],
      includeLavorazioni: canLavorazioni,
      includeMagazzino: canMagazzino,
      includeAdmin: needAdminData,
      includeDipendenti: needTimesheet,
    });
    return {
      ...composed,
      headerKpi: filterControlTowerKpiClusters(composed.headerKpi, {
        lavorazioni: canLavorazioni,
        magazzino: canMagazzino,
        admin: needAdminData,
        dipendenti: canDipendenti,
      }),
    };
  }, [
    modules,
    dash.lavRows,
    dash.globalOpts.lavorazioni.addetti,
    dash.ricambi,
    dash.magRecentMovements,
    magLog,
    useMovimentiMagLog,
    dash.movLogs,
    schedeStore,
    preventiviQ.records,
    invoicesQ.invoices,
    lavLogsQ.data,
    schedeLogsQ.data,
    activityLogRows,
    magLogsQ.data,
    movLogsQ.data,
    preventiviLogsQ.data,
    ddtLogsQ.data,
    invoicesLogsQ.data,
    invoicePaymentsLogsQ.data,
    timesheetQ.data,
    dipendentiOpts.tipiAssenza,
    dash.globalOpts.lavorazioni.stati,
    canLavorazioni,
    canMagazzino,
    needAdminData,
    canDipendenti,
    needTimesheet,
  ]);

  const isLoading =
    rbacLoading ||
    dash.isLoading ||
    (!staging && headerVisible && canPreventivi && preventiviQ.isLoading) ||
    (!staging && headerVisible && canFatturazione && invoicesQ.isLoading) ||
    (needTimesheet && timesheetQ.isPending) ||
    (needMovimenti && movimentiQ.isLoading) ||
    (activityEnabled &&
      ((canLavorazioni && (lavLogsQ.isLoading || schedeLogsQ.isLoading)) ||
        (canMagazzino && (magLogsQ.isLoading || movLogsQ.isLoading)) ||
        (canPreventivi && preventiviLogsQ.isLoading) ||
        (canDdt && ddtLogsQ.isLoading) ||
        (canFatturazione && (invoicesLogsQ.isLoading || invoicePaymentsLogsQ.isLoading))));

  const activityFeedLoading =
    rbacLoading ||
    !modules ||
    (activityEnabled &&
      ((canLavorazioni &&
          (lavLogsQ.isPending ||
            lavLogsQ.isLoading ||
            schedeLogsQ.isPending ||
            schedeLogsQ.isLoading)) ||
        (canMagazzino && (magLogsQ.isPending || magLogsQ.isLoading || movLogsQ.isPending || movLogsQ.isLoading)) ||
        (canPreventivi && (preventiviLogsQ.isPending || preventiviLogsQ.isLoading)) ||
        (canDdt && (ddtLogsQ.isPending || ddtLogsQ.isLoading)) ||
        (canFatturazione &&
          (invoicesLogsQ.isPending ||
            invoicesLogsQ.isLoading ||
            invoicePaymentsLogsQ.isPending ||
            invoicePaymentsLogsQ.isLoading))));

  return {
    staging,
    visibleWidgets,
    slices,
    headerKpiBase,
    isLoading,
    activityFeedLoading,
    canPreventivi,
    canFatturazione,
    canDdt,
    canLavorazioni,
    canMagazzino,
  };
}
