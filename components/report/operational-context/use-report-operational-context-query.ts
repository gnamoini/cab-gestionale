"use client";

import { useQuery } from "@tanstack/react-query";
import { buildAnalyticsPeriodFromContext } from "@/components/report/analytics/report-period-to-analytics";
import { useReportPeriodContext } from "@/components/report/context/report-period-context";
import type { ReportOperationalContext } from "@/lib/report/operational-context/types";

function buildQueryString(
  period: ReturnType<typeof buildAnalyticsPeriodFromContext>,
  view: "summary" | "timeline",
  cursor?: string | null,
) {
  const p = new URLSearchParams();
  p.set("preset", period.preset);
  p.set("compareMode", period.compareMode);
  p.set("from", period.start);
  p.set("to", period.end);
  p.set("view", view);
  if (cursor) p.set("cursor", cursor);
  return p.toString();
}

export function useReportOperationalContextSummaryQuery(enabled = true) {
  const periodCtx = useReportPeriodContext();
  const period = buildAnalyticsPeriodFromContext(periodCtx);
  const qs = buildQueryString(period, "summary");

  return useQuery({
    queryKey: ["report-operational-context-summary", qs],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<ReportOperationalContext> => {
      const res = await fetch(`/api/report/operational-context?${qs}`);
      if (!res.ok) throw new Error("operational_context_summary_failed");
      const json = (await res.json()) as { data: ReportOperationalContext };
      return json.data;
    },
  });
}

export function useReportOperationalContextTimelineQuery(enabled: boolean, cursor?: string | null) {
  const periodCtx = useReportPeriodContext();
  const period = buildAnalyticsPeriodFromContext(periodCtx);
  const qs = buildQueryString(period, "timeline", cursor);

  return useQuery({
    queryKey: ["report-operational-context-timeline", qs],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<ReportOperationalContext> => {
      const res = await fetch(`/api/report/operational-context?${qs}`);
      if (!res.ok) throw new Error("operational_context_timeline_failed");
      const json = (await res.json()) as { data: ReportOperationalContext };
      return json.data;
    },
  });
}
