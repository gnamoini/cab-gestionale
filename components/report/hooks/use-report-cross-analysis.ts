"use client";

import { useEffect, useState } from "react";
import type { DateRange, ReportCompareMode } from "@/lib/report/date-ranges";
import type { ReportPayload } from "@/lib/report/contracts/report-payload";
import type { CrossMetricDto, CrossPayloadData } from "@/lib/report/cross-analysis/types";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mapCompareMode(mode: ReportCompareMode): string {
  if (mode === "prev_period" || mode === "prev_year" || mode === "none") return mode;
  return "none";
}

function buildCrossUrl(range: DateRange, compareMode: ReportCompareMode): string {
  const params = new URLSearchParams({
    preset: "custom",
    from: ymd(range.start),
    to: ymd(range.end),
    compareMode: mapCompareMode(compareMode),
  });
  return `/api/report/cross-analysis?${params.toString()}`;
}

export type UseReportCrossAnalysisResult = {
  metrics: CrossMetricDto[] | null;
  trustStatus: string | null;
  dataWarnings: string[] | null;
  loading: boolean;
  error: string | null;
};

export function useReportCrossAnalysis(
  range: DateRange | null,
  compareMode: ReportCompareMode,
): UseReportCrossAnalysisResult {
  const [metrics, setMetrics] = useState<CrossMetricDto[] | null>(null);
  const [trustStatus, setTrustStatus] = useState<string | null>(null);
  const [dataWarnings, setDataWarnings] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!range) {
      setMetrics(null);
      setTrustStatus(null);
      setDataWarnings(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetch(buildCrossUrl(range, compareMode), {
          signal: controller.signal,
          credentials: "same-origin",
        });
        if (res.status === 404) {
          setMetrics(null);
          setError(null);
          return;
        }
        if (!res.ok) {
          setError(res.status === 403 ? "Permesso negato" : `Errore ${res.status}`);
          setMetrics(null);
          return;
        }
        const payload = (await res.json()) as ReportPayload<CrossPayloadData>;
        setMetrics(payload.data.metrics);
        setTrustStatus(payload.metadata.trustStatus ?? null);
        setDataWarnings(payload.metadata.dataWarnings ?? null);
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Caricamento non riuscito");
        setMetrics(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [range?.start.getTime(), range?.end.getTime(), compareMode]);

  return { metrics, trustStatus, dataWarnings, loading, error };
}
