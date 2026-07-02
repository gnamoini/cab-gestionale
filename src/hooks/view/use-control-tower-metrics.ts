"use client";

import { useMemo } from "react";
import { isStagingPublicSlice } from "@/lib/env/staging-public";
import { moduleAllows } from "@/src/lib/auth/effective-module-access";
import {
  composeControlTowerSlices,
  filterControlTowerKpiClusters,
} from "@/lib/dashboard/control-tower-selectors";
import { resolveVisibleDashboardWidgets } from "@/lib/dashboard/dashboard-widget-registry";
import { useDashboardMetrics } from "@/src/hooks/view/use-dashboard-metrics";
import { usePreventiviRecordsQuery } from "@/src/hooks/gestionale/use-preventivi-records-query";
import { useInvoicesQuery } from "@/src/hooks/gestionale/use-invoices-query";
import { useLogListQuery, useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";
import { GESTIONALE_LOG_FEED_LIMIT } from "@/lib/react-query/query-layer-policies";
import { useViewQueryOpts } from "@/lib/view/view-query-opts";
import { monthKeyFromYmd } from "@/lib/report/date-ranges";
import { todayDateYmd } from "@/lib/dipendenti/timesheet-month";
import { useDashboardPromemoria } from "@/src/hooks/use-dashboard-promemoria";
import type { DashboardPromemoriaMonthKey } from "@/lib/dashboard/dashboard-promemoria-types";
import {
  pickDashboardPriorityLavorazioneIds,
  DASHBOARD_SCHEde_PREFETCH_LIMIT,
} from "@/lib/view/dashboard-widgets-selectors";
import { useSchedeBundlesQuery } from "@/src/hooks/use-schede-store-query";

export function useControlTowerMetrics() {
  const staging = isStagingPublicSlice();
  const viewOpts = useViewQueryOpts();
  const { snapshot, isLoading: rbacLoading } = useEffectivePermissions();
  const modules = snapshot?.modules;

  const visibleWidgets = useMemo(
    () => (modules ? resolveVisibleDashboardWidgets({ modules, staging }) : []),
    [modules, staging],
  );
  const visibleIds = useMemo(() => new Set(visibleWidgets.map((w) => w.id)), [visibleWidgets]);

  const canLavorazioni = modules ? moduleAllows(modules, "lavorazioni", "read") : false;
  const canMagazzino = modules ? moduleAllows(modules, "magazzino", "read") : false;
  const canPreventivi = modules ? moduleAllows(modules, "preventivi", "read") : false;
  const canFatturazione = modules ? moduleAllows(modules, "fatturazione", "read") : false;

  const adminBacklogVisible = visibleIds.has("admin-backlog");
  const activityVisible = visibleIds.has("recent-activity");
  const calendarVisible = visibleIds.has("operational-calendar");
  const headerVisible = visibleIds.has("operational-kpi-header");
  const alertsVisible = visibleIds.has("alerts-anomalies");
  const wipVisible = visibleIds.has("lavorazioni-kpi");

  const dash = useDashboardMetrics();

  const needAdminData = !staging && adminBacklogVisible && (canPreventivi || canFatturazione);
  const preventiviQ = usePreventiviRecordsQuery(needAdminData && canPreventivi);
  const invoicesQ = useInvoicesQuery(needAdminData && canFatturazione);

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

  const mezziQ = useMezziListQuery(undefined, {
    ...viewOpts,
    enabled: !staging && headerVisible && canLavorazioni,
    staleTime: 60_000,
  });

  const monthKey = (monthKeyFromYmd(todayDateYmd()) ?? "1970-01") as DashboardPromemoriaMonthKey;
  const promemoriaQ = useDashboardPromemoria(!staging && calendarVisible ? monthKey : ("0000-00" as DashboardPromemoriaMonthKey));

  const schedeIds = useMemo(
    () => pickDashboardPriorityLavorazioneIds(dash.lavQuery.data ?? [], DASHBOARD_SCHEde_PREFETCH_LIMIT),
    [dash.lavQuery.data],
  );
  const needSchede = !staging && (alertsVisible || wipVisible) && canLavorazioni;
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
      lavRows: dash.lavQuery.data ?? [],
      schedeStore,
      defaultAddetto: dash.globalOpts.lavorazioni.addetti[0] ?? "",
      ricambi: dash.magQuery.data ?? [],
      magMovements: dash.magRecentMovements,
      movimentiLogs: movLogsQ.data ?? [],
      mezzi: mezziQ.data ?? [],
      preventivi: preventiviQ.records,
      invoices: invoicesQ.invoices,
      logLavorazioni: lavLogsQ.data ?? [],
      logMagazzino: magLogsQ.data ?? [],
      logMovimenti: movLogsQ.data ?? [],
      logAdmin: adminLogRows,
      promemoria: calendarVisible ? promemoriaQ.rows : [],
      includeLavorazioni: canLavorazioni,
      includeMagazzino: canMagazzino,
      includeAdmin: needAdminData,
    });
    return {
      ...composed,
      headerKpi: filterControlTowerKpiClusters(composed.headerKpi, {
        lavorazioni: canLavorazioni,
        magazzino: canMagazzino,
        admin: needAdminData,
      }),
    };
  }, [
    modules,
    dash.lavQuery.data,
    dash.globalOpts.lavorazioni.addetti,
    dash.magQuery.data,
    dash.magRecentMovements,
    schedeStore,
    movLogsQ.data,
    mezziQ.data,
    preventiviQ.records,
    invoicesQ.invoices,
    lavLogsQ.data,
    magLogsQ.data,
    adminLogRows,
    calendarVisible,
    promemoriaQ.rows,
    canLavorazioni,
    canMagazzino,
    needAdminData,
  ]);

  const isLoading =
    rbacLoading ||
    dash.isLoading ||
    (needAdminData && canPreventivi && preventiviQ.isLoading) ||
    (needAdminData && canFatturazione && invoicesQ.isLoading) ||
    (headerVisible && canLavorazioni && mezziQ.isLoading) ||
    (activityEnabled && (lavLogsQ.isLoading || magLogsQ.isLoading || movLogsQ.isLoading));

  return {
    staging,
    visibleWidgets,
    slices,
    dash,
    isLoading,
    canPreventivi,
    canFatturazione,
  };
}
