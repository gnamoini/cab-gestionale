"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReportPayload } from "@/lib/report/contracts/report-payload";
import type { ReportAnalyticsResult } from "@/lib/report/analytics-engine/types";
import type { ReportAnalyticsQueryKeyInput } from "@/components/report/analytics/report-analytics-query-keys";
import { reportAnalyticsQueryKey } from "@/components/report/analytics/report-analytics-query-keys";

function buildAnalyticsUrl(input: ReportAnalyticsQueryKeyInput): string {
  const params = new URLSearchParams({
    preset: input.period.preset,
    from: input.period.start,
    to: input.period.end,
    compareMode: input.period.compareMode,
    metrics: input.metricIds.join(","),
  });
  if (input.includeSeries) params.set("includeSeries", "true");
  if (input.granularity) params.set("granularity", input.granularity);
  if (input.dimensions?.length) params.set("dimensions", input.dimensions.join(","));
  return `/api/report/analytics?${params.toString()}`;
}

export function useReportAnalyticsQuery(input: ReportAnalyticsQueryKeyInput & { enabled?: boolean }) {
  const enabled = (input.enabled ?? true) && input.metricIds.length > 0;
  return useQuery({
    queryKey: reportAnalyticsQueryKey(input),
    enabled,
    staleTime: 30_000,
    queryFn: async ({ signal }) => {
      const res = await fetch(buildAnalyticsUrl(input), { signal, credentials: "same-origin" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Errore ${res.status}`);
      }
      const payload = (await res.json()) as ReportPayload<ReportAnalyticsResult>;
      return payload.data;
    },
  });
}
