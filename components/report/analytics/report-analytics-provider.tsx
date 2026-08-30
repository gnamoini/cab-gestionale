"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ReportAnalyticsGranularity, ReportAnalyticsResult } from "@/lib/report/analytics-engine/types";
import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";
import type { ReportDimensionId } from "@/lib/report/metrics/report-metric-types";
import { useReportPeriodContext } from "@/components/report/context/report-period-context";
import { buildAnalyticsPeriodFromContext } from "@/components/report/analytics/report-period-to-analytics";
import { normalizeMetricIds } from "@/components/report/analytics/report-analytics-query-keys";
import { useReportAnalyticsQuery } from "@/components/report/analytics/hooks/use-report-analytics-query";
import type { BiSectionId } from "@/components/report/analytics/resolve-section-metric-ids";
import { resolveSectionMetricIds } from "@/components/report/analytics/resolve-section-metric-ids";

export type AnalyticsRegistration = {
  metricIds: readonly string[];
  includeSeries?: boolean;
  granularity?: ReportAnalyticsGranularity;
  dimensions?: readonly ReportDimensionId[];
};

type ReportAnalyticsContextValue = {
  envelopesById: ReadonlyMap<string, ReportMetricEnvelope>;
  result: ReportAnalyticsResult | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  registerRequirements: (key: string, registration: AnalyticsRegistration | null) => void;
};

const ReportAnalyticsContext = createContext<ReportAnalyticsContextValue | null>(null);

function mergeRegistrations(regs: Map<string, AnalyticsRegistration>): {
  metricIds: string[];
  includeSeries: boolean;
  granularity?: ReportAnalyticsGranularity;
  dimensions: ReportDimensionId[];
} {
  const metricSet = new Set<string>();
  let includeSeries = false;
  let granularity: ReportAnalyticsGranularity | undefined;
  const dimensionSet = new Set<ReportDimensionId>();

  for (const reg of regs.values()) {
    for (const id of reg.metricIds) metricSet.add(id);
    if (reg.includeSeries) {
      includeSeries = true;
      granularity = reg.granularity ?? granularity ?? "week";
    }
    for (const d of reg.dimensions ?? []) dimensionSet.add(d);
  }

  return {
    metricIds: normalizeMetricIds([...metricSet]),
    includeSeries,
    granularity,
    dimensions: [...dimensionSet],
  };
}

export function ReportAnalyticsProvider({ children }: { children: ReactNode }) {
  const periodCtx = useReportPeriodContext();
  const period = useMemo(() => buildAnalyticsPeriodFromContext(periodCtx), [periodCtx]);

  const [registrations, setRegistrations] = useState<Map<string, AnalyticsRegistration>>(() => new Map());

  const registerRequirements = useCallback((key: string, registration: AnalyticsRegistration | null) => {
    setRegistrations((prev) => {
      const next = new Map(prev);
      if (!registration) next.delete(key);
      else next.set(key, registration);
      return next;
    });
  }, []);

  const merged = useMemo(() => mergeRegistrations(registrations), [registrations]);

  const query = useReportAnalyticsQuery({
    period,
    metricIds: merged.metricIds,
    includeSeries: merged.includeSeries,
    granularity: merged.granularity,
    dimensions: merged.dimensions.length ? merged.dimensions : undefined,
    enabled: merged.metricIds.length > 0,
  });

  const envelopesById = useMemo(() => {
    const map = new Map<string, ReportMetricEnvelope>();
    for (const env of query.data?.metrics ?? []) map.set(env.metricId, env);
    return map;
  }, [query.data?.metrics]);

  const value = useMemo(
    (): ReportAnalyticsContextValue => ({
      envelopesById,
      result: query.data,
      isLoading: query.isLoading,
      isError: query.isError,
      error: query.error,
      refetch: () => void query.refetch(),
      registerRequirements,
    }),
    [envelopesById, query, registerRequirements],
  );

  return <ReportAnalyticsContext.Provider value={value}>{children}</ReportAnalyticsContext.Provider>;
}

export function useReportAnalyticsContext(): ReportAnalyticsContextValue {
  const ctx = useContext(ReportAnalyticsContext);
  if (!ctx) throw new Error("useReportAnalyticsContext requires ReportAnalyticsProvider");
  return ctx;
}

export function useRegisterAnalyticsSection(
  sectionKey: string,
  sectionId: BiSectionId,
  extra?: Partial<AnalyticsRegistration>,
) {
  const { registerRequirements } = useReportAnalyticsContext();
  const extraMetricIds = extra?.metricIds;
  const metricIds = useMemo(
    () => (extraMetricIds?.length ? [...extraMetricIds] : [...resolveSectionMetricIds(sectionId)]),
    [sectionId, extraMetricIds],
  );
  const dimensionsKey = extra?.dimensions?.join(",") ?? "";

  useEffect(() => {
    if (metricIds.length === 0) {
      registerRequirements(sectionKey, null);
      return;
    }
    registerRequirements(sectionKey, { metricIds, ...extra });
    return () => registerRequirements(sectionKey, null);
  }, [
    sectionKey,
    metricIds,
    extra,
    extra?.includeSeries,
    extra?.granularity,
    dimensionsKey,
    registerRequirements,
  ]);
}

export function useAnalyticsEnvelope(metricId: string): ReportMetricEnvelope | undefined {
  return useReportAnalyticsContext().envelopesById.get(metricId);
}
