"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BusinessReport } from "@/lib/report/business-report/types";
import { useReportPeriodContext } from "@/components/report/context/report-period-context";
import { resolveBusinessReportType } from "@/lib/report/business-report/period/resolve-business-report-period";
import { resolveBusinessReportEnabledClient } from "@/lib/feature-flags/report-v2-flag";

type HistoryResponse = {
  history: Array<{
    id: string;
    logical_report_key: string;
    generation_version: number;
    report_type: string;
    period_start: string;
    period_end: string;
    status: string;
    ai_status: string;
    content?: BusinessReport | null;
  }>;
};

function periodQueryKey(ctx: ReturnType<typeof useReportPeriodContext>) {
  return [
    "business-report",
    ctx.preset,
    ctx.range.start.toISOString(),
    ctx.range.end.toISOString(),
    ctx.compareMode,
  ].join(":");
}

export function useBusinessReportQuery() {
  const periodCtx = useReportPeriodContext();
  const reportType = resolveBusinessReportType(periodCtx.preset);
  const featureEnabled = resolveBusinessReportEnabledClient();
  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("preset", periodCtx.preset);
    p.set("compareMode", periodCtx.compareMode);
    if (periodCtx.preset === "custom") {
      p.set("start", periodCtx.customFrom);
      p.set("end", periodCtx.customTo);
    }
    p.set("reportType", reportType);
    return p.toString();
  }, [periodCtx, reportType]);

  return useQuery({
    queryKey: ["business-report", qs],
    enabled: featureEnabled,
    queryFn: async (): Promise<BusinessReport | null> => {
      const res = await fetch(`/api/report/business-report?${qs}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("business_report_fetch_failed");
      const json = (await res.json()) as { data: BusinessReport };
      return json.data;
    },
    staleTime: 60_000,
  });
}

export function useBusinessReportHistoryQuery() {
  const featureEnabled = resolveBusinessReportEnabledClient();
  return useQuery({
    queryKey: ["business-report-history"],
    enabled: featureEnabled,
    queryFn: async () => {
      const res = await fetch("/api/report/business-report/history");
      if (!res.ok) throw new Error("history_failed");
      return (await res.json()) as HistoryResponse;
    },
  });
}

export function useBusinessReportGenerate() {
  const periodCtx = useReportPeriodContext();
  const qc = useQueryClient();
  const reportType = resolveBusinessReportType(periodCtx.preset);
  const featureEnabled = resolveBusinessReportEnabledClient();

  return useMutation({
    mutationFn: async (regenerate: boolean) => {
      if (!featureEnabled) throw new Error("feature_disabled");
      const p = new URLSearchParams();
      p.set("preset", periodCtx.preset);
      p.set("compareMode", periodCtx.compareMode);
      if (periodCtx.preset === "custom") {
        p.set("start", periodCtx.customFrom);
        p.set("end", periodCtx.customTo);
      }
      const res = await fetch(`/api/report/business-report?${p.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType, regenerate }),
      });
      if (res.status === 429) throw new Error("rate_limited");
      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        throw new Error(err.message ?? "generate_failed");
      }
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["business-report"] });
      void qc.invalidateQueries({ queryKey: ["business-report-history"] });
    },
  });
}

export function useBusinessReportDetail(runId: string | null) {
  const featureEnabled = resolveBusinessReportEnabledClient();
  return useQuery({
    queryKey: ["business-report-detail", runId],
    enabled: featureEnabled && Boolean(runId),
    queryFn: async (): Promise<BusinessReport | null> => {
      if (!runId) return null;
      const res = await fetch(`/api/report/business-report?runId=${encodeURIComponent(runId)}`);
      if (!res.ok) return null;
      const json = (await res.json()) as { data: BusinessReport };
      return json.data;
    },
  });
}

export { periodQueryKey };
