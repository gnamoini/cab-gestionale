"use client";

import { useEffect, useState } from "react";
import type { DateRange, ReportCompareMode } from "@/lib/report/date-ranges";
import type { ReportPayload } from "@/lib/report/contracts/report-payload";
import type { InsightDto, InsightPayloadData } from "@/lib/report/insights/types";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mapCompareMode(mode: ReportCompareMode): string {
  if (mode === "prev_period" || mode === "prev_year" || mode === "none") return mode;
  return "none";
}

function buildInsightsUrl(range: DateRange, compareMode: ReportCompareMode): string {
  const params = new URLSearchParams({
    preset: "custom",
    from: ymd(range.start),
    to: ymd(range.end),
    compareMode: mapCompareMode(compareMode),
  });
  return `/api/report/insights?${params.toString()}`;
}

export type UseReportInsightsResult = {
  insights: InsightDto[] | null;
  loading: boolean;
  error: string | null;
};

export function useReportInsights(
  range: DateRange | null,
  compareMode: ReportCompareMode,
): UseReportInsightsResult {
  const [insights, setInsights] = useState<InsightDto[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!range) {
      setInsights(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetch(buildInsightsUrl(range, compareMode), {
          signal: controller.signal,
          credentials: "same-origin",
        });
        if (res.status === 404) {
          setInsights(null);
          setError(null);
          return;
        }
        if (!res.ok) {
          setError(res.status === 403 ? "Permesso negato" : `Errore ${res.status}`);
          setInsights(null);
          return;
        }
        const payload = (await res.json()) as ReportPayload<InsightPayloadData>;
        setInsights(payload.data.insights);
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Caricamento non riuscito");
        setInsights(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [range?.start.getTime(), range?.end.getTime(), compareMode]);

  return { insights, loading, error };
}
