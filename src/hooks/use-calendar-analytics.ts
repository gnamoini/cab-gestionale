"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  buildMonthHasDataMap,
  getDayEvents,
  getDayInsights,
  getDaySummary,
  getWeekInsights,
  getWeekSummary,
  type CalendarLifecycleFilters,
  type CalendarReportServiceInput,
  weekStartYmdFromYmd,
} from "@/lib/report/calendar-report-service";
import { buildAssetLifecycleKpiModel } from "@/lib/report/asset-lifecycle/build-asset-lifecycle-kpi-model";
import { monthRangeFromKey } from "@/lib/report/date-ranges";
import { buildReportDerivedBundle } from "@/lib/report/report-derived-cache";
import { useReportLiveData } from "@/lib/report/use-report-live-data";
import { isAssetLifecycleSubFlagActive } from "@/lib/officina/asset-lifecycle-v1-flag";
import { GESTIONALE_REPORT_STALE_MS } from "@/lib/react-query/query-layer-policies";
import { assetComplianceEntry } from "@/lib/domain/asset-compliance-entry";
import { assetTimelineEntry } from "@/lib/domain/asset-timeline-entry";
import { useAssetLifecycleV1Enabled } from "@/src/hooks/use-asset-lifecycle-v1-enabled";
import type { CalendarSelection } from "@/components/dashboard/calendar-v2/calendar-v2-types";

export type { CalendarSelection };

const DEFAULT_LIFECYCLE_FILTERS: CalendarLifecycleFilters = {
  showOperational: true,
  showLifecycle: true,
  minPriority: "low",
};

function buildServiceInput(
  live: ReturnType<typeof useReportLiveData>,
  semanticIndex: ReturnType<typeof buildReportDerivedBundle>["semanticIndex"],
  anchor: Date,
  lifecycleTimeline: CalendarReportServiceInput["lifecycleTimeline"],
  lifecycleKpi: CalendarReportServiceInput["lifecycleKpi"],
  lifecycleFilters: CalendarLifecycleFilters,
): CalendarReportServiceInput {
  return {
    anchor,
    attive: live.attive,
    storico: live.storico,
    completate: live.completate,
    manualByMonth: live.manualByMonth,
    mezzi: live.mezzi,
    magazzino: live.magazzino,
    magLog: live.magLog,
    lavRows: live.lavListRows,
    semanticIndex,
    queryMeta: live.integrityView.queryMeta,
    lifecycleTimeline,
    lifecycleKpi,
    lifecycleFilters,
  };
}

export function useCalendarAnalytics(
  monthKey: string,
  selection: CalendarSelection,
  enabled = true,
) {
  const live = useReportLiveData();
  const lifecycleFlags = useAssetLifecycleV1Enabled();
  const anchor = useMemo(() => new Date(), []);
  const timelineEnabled =
    enabled &&
    isAssetLifecycleSubFlagActive(lifecycleFlags, "timeline_calendar") &&
    !live.isLoading;

  const monthRange = useMemo(() => monthRangeFromKey(monthKey), [monthKey]);

  const timelineQuery = useQuery({
    queryKey: ["calendar-v2", "lifecycle-timeline", monthKey, live.snapshotFingerprint],
    queryFn: async () => {
      if (!monthRange) return [];
      const res = await assetTimelineEntry.listInRange(monthRange);
      return res.success ? res.data : [];
    },
    enabled: timelineEnabled && monthRange != null,
    staleTime: GESTIONALE_REPORT_STALE_MS,
  });

  const complianceRulesQuery = useQuery({
    queryKey: ["calendar-v2", "lifecycle-rules", live.snapshotFingerprint],
    queryFn: async () => {
      const res = await assetComplianceEntry.listUpcomingRules(90);
      return res.success ? res.data : [];
    },
    enabled: timelineEnabled && isAssetLifecycleSubFlagActive(lifecycleFlags, "compliance"),
    staleTime: GESTIONALE_REPORT_STALE_MS,
  });

  const lifecycleKpi = useMemo(() => {
    if (!isAssetLifecycleSubFlagActive(lifecycleFlags, "timeline_calendar")) return null;
    return buildAssetLifecycleKpiModel({
      anchor,
      timelineRows: timelineQuery.data ?? [],
      complianceRules: complianceRulesQuery.data ?? [],
      lavorazioni: live.lavListRows,
    });
  }, [
    lifecycleFlags,
    anchor,
    timelineQuery.data,
    complianceRulesQuery.data,
    live.lavListRows,
  ]);

  const derivedBundle = useMemo(
    () =>
      buildReportDerivedBundle({
        completate: live.completate,
        manualByMonth: live.manualByMonth,
        mezzi: live.mezzi,
        magLog: live.magLog,
        magazzino: live.magazzino,
        queryMeta: live.integrityView.queryMeta,
      }),
    [
      live.completate,
      live.manualByMonth,
      live.mezzi,
      live.magLog,
      live.magazzino,
      live.integrityView.queryMeta,
    ],
  );

  const serviceInput = useMemo(
    () =>
      buildServiceInput(
        live,
        derivedBundle.semanticIndex,
        anchor,
        timelineQuery.data ?? undefined,
        lifecycleKpi,
        DEFAULT_LIFECYCLE_FILTERS,
      ),
    [live, derivedBundle.semanticIndex, anchor, timelineQuery.data, lifecycleKpi],
  );

  const fingerprint = live.snapshotFingerprint;
  const dataReady = enabled && !live.isLoading && !live.isError;

  const hasDataQuery = useQuery({
    queryKey: ["calendar-v2", "month-has-data", monthKey, fingerprint, timelineQuery.data?.length ?? 0],
    queryFn: () => buildMonthHasDataMap(serviceInput, monthKey),
    enabled: dataReady,
    staleTime: GESTIONALE_REPORT_STALE_MS,
  });

  const selectedYmd = selection.mode === "day" ? selection.ymd : selection.weekStartYmd;
  const weekStartYmd =
    selection.mode === "week" ? selection.weekStartYmd : weekStartYmdFromYmd(selectedYmd) ?? selectedYmd;

  const daySummaryQuery = useQuery({
    queryKey: ["calendar-v2", "day-summary", selectedYmd, fingerprint],
    queryFn: () => getDaySummary(serviceInput, selectedYmd),
    enabled: dataReady && selection.mode === "day",
    staleTime: GESTIONALE_REPORT_STALE_MS,
  });

  const weekSummaryQuery = useQuery({
    queryKey: ["calendar-v2", "week-summary", weekStartYmd, fingerprint],
    queryFn: () => getWeekSummary(serviceInput, weekStartYmd),
    enabled: dataReady && selection.mode === "week",
    staleTime: GESTIONALE_REPORT_STALE_MS,
  });

  const dayEventsQuery = useQuery({
    queryKey: ["calendar-v2", "day-events", selectedYmd, fingerprint, timelineQuery.data?.length ?? 0],
    queryFn: () => getDayEvents(serviceInput, selectedYmd),
    enabled: dataReady && selection.mode === "day",
    staleTime: GESTIONALE_REPORT_STALE_MS,
  });

  const dayInsightsQuery = useQuery({
    queryKey: ["calendar-v2", "day-insights", selectedYmd, fingerprint],
    queryFn: () => getDayInsights(serviceInput, selectedYmd),
    enabled: false,
    staleTime: GESTIONALE_REPORT_STALE_MS,
  });

  const weekInsightsQuery = useQuery({
    queryKey: ["calendar-v2", "week-insights", weekStartYmd, fingerprint],
    queryFn: () => getWeekInsights(serviceInput, weekStartYmd),
    enabled: false,
    staleTime: GESTIONALE_REPORT_STALE_MS,
  });

  return {
    live,
    derivedBundle,
    serviceInput,
    anchor,
    lifecycleKpi,
    hasDataByDate: hasDataQuery.data ?? {},
    daySummary: daySummaryQuery.data ?? null,
    weekSummary: weekSummaryQuery.data ?? null,
    dayEvents: dayEventsQuery.data ?? [],
    dayInsights: dayInsightsQuery.data ?? null,
    weekInsights: weekInsightsQuery.data ?? null,
    isLoading: live.isLoading || hasDataQuery.isLoading,
    isError: live.isError,
    isPanelLoading:
      selection.mode === "day"
        ? daySummaryQuery.isLoading || dayEventsQuery.isLoading
        : weekSummaryQuery.isLoading,
    refetchDayInsights: dayInsightsQuery.refetch,
    refetchWeekInsights: weekInsightsQuery.refetch,
    isFetchingDayInsights: dayInsightsQuery.isFetching,
    isFetchingWeekInsights: weekInsightsQuery.isFetching,
  };
}
