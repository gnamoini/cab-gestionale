"use client";

import { useMemo } from "react";
import { isStagingPublicSlice } from "@/lib/env/staging-public";
import { moduleAllows } from "@/src/lib/auth/effective-module-access";
import {
  composeControlTowerSlices,
  filterControlTowerKpiClusters,
} from "@/lib/dashboard/control-tower-selectors";
import {
  getControlTowerCurrentWeekRange,
  getControlTowerPreviousWeekSameWindowRange,
} from "@/lib/dashboard/control-tower-time-ranges";
import { resolveVisibleDashboardWidgets } from "@/lib/dashboard/dashboard-widget-registry";
import { useDashboardMetrics } from "@/src/hooks/view/use-dashboard-metrics";
import { usePreventiviRecordsQuery } from "@/src/hooks/gestionale/use-preventivi-records-query";
import { useInvoicesQuery } from "@/src/hooks/gestionale/use-invoices-query";
import { useLogListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";
import { GESTIONALE_LOG_FEED_LIMIT } from "@/lib/react-query/query-layer-policies";
import { useViewQueryOpts } from "@/lib/view/view-query-opts";
import { workshopScheduleEntry } from "@/lib/domain/workshop-schedule-entry";
import { ymdFromDate } from "@/lib/report/date-ranges";
import { ymdFromIso } from "@/lib/workshop-schedule/datetime";
import {
  pickDashboardPriorityLavorazioneIds,
  DASHBOARD_SCHEde_PREFETCH_LIMIT,
} from "@/lib/view/dashboard-widgets-selectors";
import { useSchedeBundlesQuery } from "@/src/hooks/use-schede-store-query";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { QK } from "@/src/lib/react-query/query-keys";
import { workshopScheduleQueryKeys } from "@/src/services/domain/workshop-schedule-domain.queries";
import { dipendentiTimesheetEntry } from "@/lib/domain/dipendenti-timesheet-entry";
import type { DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";
import type { DashboardMagMovementRow } from "@/lib/view/dashboard-widgets-selectors";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { EffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/types";
import type { DashboardWidgetDefinition } from "@/lib/dashboard/dashboard-widget-registry";

export type ControlTowerDashSlice = {
  globalOpts: ReturnType<typeof useGlobalOptions>;
  lavRows: readonly LavorazioneListRow[];
  ricambi: readonly RicambioMagazzino[];
  magRecentMovements: readonly DashboardMagMovementRow[];
  isLoading: boolean;
};

export function controlTowerDashSliceFromMetrics(
  dash: ReturnType<typeof useDashboardMetrics>,
): ControlTowerDashSlice {
  return {
    globalOpts: dash.globalOpts,
    lavRows: dash.lavQuery.data ?? [],
    ricambi: dash.magQuery.data ?? [],
    magRecentMovements: dash.magRecentMovements,
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
    isLoading: false,
  };
}

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
  canDipendenti: boolean;
  adminBacklogVisible: boolean;
  activityVisible: boolean;
  headerVisible: boolean;
  alertsVisible: boolean;
  wipVisible: boolean;
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
    canDipendenti: modules ? moduleAllows(modules, "dipendenti", "read") : false,
    adminBacklogVisible: visibleIds.has("admin-backlog"),
    activityVisible: visibleIds.has("recent-activity"),
    headerVisible: visibleIds.has("operational-kpi-header"),
    alertsVisible: visibleIds.has("alerts-anomalies"),
    wipVisible: visibleIds.has("lavorazioni-kpi"),
    globalOpts,
    dipendentiOpts,
  };
}

export function useControlTowerMetricsValue(shell: ControlTowerShell, dash: ControlTowerDashSlice) {
  const viewOpts = useViewQueryOpts();
  const {
    staging,
    rbacLoading,
    modules,
    visibleWidgets,
    canLavorazioni,
    canMagazzino,
    canPreventivi,
    canFatturazione,
    canDipendenti,
    adminBacklogVisible,
    activityVisible,
    headerVisible,
    alertsVisible,
    wipVisible,
    visibleIds,
    dipendentiOpts,
  } = shell;

  const needAdminData =
    !staging &&
    ((adminBacklogVisible && canFatturazione) || (headerVisible && (canPreventivi || canFatturazione)));
  const preventiviQ = usePreventiviRecordsQuery(!staging && headerVisible && canPreventivi);
  const needInvoices = !staging && (adminBacklogVisible || headerVisible) && canFatturazione;
  const invoicesQ = useInvoicesQuery(needInvoices);

  const activityEnabled = !staging && activityVisible;
  const lavLogsQ = useLogListQuery(
    { entita: "lavorazioni", limit: GESTIONALE_LOG_FEED_LIMIT },
    { enabled: activityEnabled && canLavorazioni, ...viewOpts },
  );
  const magLogsQ = useLogListQuery(
    { entita: "magazzino_ricambi", limit: GESTIONALE_LOG_FEED_LIMIT },
    { enabled: activityEnabled && canMagazzino, ...viewOpts },
  );
  const movLogsQ = useLogListQuery(
    { entita: "movimenti_ricambi", limit: GESTIONALE_LOG_FEED_LIMIT },
    { enabled: activityEnabled && canMagazzino, ...viewOpts },
  );
  const preventiviLogsQ = useLogListQuery(
    { entita: "preventivi", limit: GESTIONALE_LOG_FEED_LIMIT },
    { enabled: activityEnabled && canPreventivi, ...viewOpts },
  );
  const fattureLogsQ = useLogListQuery(
    { entita: "fatturazione", limit: GESTIONALE_LOG_FEED_LIMIT },
    { enabled: activityEnabled && canFatturazione, ...viewOpts },
  );

  const timesheetRange = useMemo(() => {
    const cur = getControlTowerCurrentWeekRange();
    const prev = getControlTowerPreviousWeekSameWindowRange();
    return { from: ymdFromDate(prev.start), to: ymdFromDate(cur.end) };
  }, []);

  const needAgenda = !staging && visibleIds.has("operational-calendar");
  const agendaRange = useMemo(() => {
    const today = ymdFromIso(new Date().toISOString());
    return {
      start: new Date(`${today}T00:00:00`).toISOString(),
      end: new Date(`${today}T23:59:59`).toISOString(),
    };
  }, []);
  const agendaQ = useServiceQuery(
    [...workshopScheduleQueryKeys.root, "control-tower", agendaRange.start] as const,
    () => workshopScheduleEntry.enrichedView(agendaRange.start, agendaRange.end),
    { enabled: needAgenda, ...viewOpts },
  );
  const needTimesheet = !staging && headerVisible && canDipendenti;
  const timesheetQ = useServiceQuery(
    [...QK.dipendentiTimesheetEntries, "control-tower", timesheetRange.from, timesheetRange.to] as const,
    () => dipendentiTimesheetEntry.listEntriesForRange(timesheetRange.from, timesheetRange.to),
    { enabled: needTimesheet, ...viewOpts },
  );

  const schedeIds = useMemo(
    () => pickDashboardPriorityLavorazioneIds(dash.lavRows, DASHBOARD_SCHEde_PREFETCH_LIMIT),
    [dash.lavRows],
  );
  const needSchede = !staging && (alertsVisible || wipVisible || activityVisible) && canLavorazioni;
  const { store: schedeStore } = useSchedeBundlesQuery(needSchede, { lavorazioneIds: schedeIds });

  const adminLogRows = useMemo(() => {
    const rows = [];
    if (canPreventivi) rows.push(...(preventiviLogsQ.data ?? []));
    if (canFatturazione) rows.push(...(fattureLogsQ.data ?? []));
    return rows;
  }, [canFatturazione, canPreventivi, fattureLogsQ.data, preventiviLogsQ.data]);

  const slices = useMemo(() => {
    if (!modules) return null;
    const composed = composeControlTowerSlices({
      lavRows: dash.lavRows,
      schedeStore,
      defaultAddetto: dash.globalOpts.lavorazioni.addetti[0] ?? "",
      ricambi: dash.ricambi,
      magMovements: dash.magRecentMovements,
      movimentiLogs: movLogsQ.data ?? [],
      preventivi: preventiviQ.records,
      invoices: invoicesQ.invoices,
      logLavorazioni: lavLogsQ.data ?? [],
      logMagazzino: magLogsQ.data ?? [],
      logMovimenti: movLogsQ.data ?? [],
      logAdmin: adminLogRows,
      timesheetEntries: (timesheetQ.data ?? []) as DipendenteTimesheetEntryRow[],
      tipiAssenza: dipendentiOpts.tipiAssenza,
      statiLavorazione: dash.globalOpts.lavorazioni.stati,
      agendaSessions: agendaQ.data ?? [],
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
    schedeStore,
    movLogsQ.data,
    preventiviQ.records,
    invoicesQ.invoices,
    lavLogsQ.data,
    magLogsQ.data,
    adminLogRows,
    timesheetQ.data,
    dipendentiOpts.tipiAssenza,
    dash.globalOpts.lavorazioni.stati,
    agendaQ.data,
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
    (needInvoices && invoicesQ.isLoading) ||
    (needTimesheet && timesheetQ.isPending) ||
    (needAgenda && agendaQ.isPending) ||
    (activityEnabled && (lavLogsQ.isLoading || magLogsQ.isLoading || movLogsQ.isLoading));

  return {
    staging,
    visibleWidgets,
    slices,
    isLoading,
    canPreventivi,
    canFatturazione,
    canLavorazioni,
    canMagazzino,
  };
}

/** @deprecated Prefer ControlTowerMetricsProvider conditional mount. */
export function useControlTowerMetrics() {
  const shell = useControlTowerShell();
  const dash = controlTowerDashSliceFromMetrics(useDashboardMetrics());
  return useControlTowerMetricsValue(shell, dash);
}
