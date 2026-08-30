"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildReportAnalysisContext,
  type BuildReportAnalysisContextInput,
} from "@/lib/report/report-analysis/build-report-analysis-context";
import {
  readReportAnalysisCache,
  writeReportAnalysisCache,
} from "@/lib/report/report-analysis/report-analysis-cache";
import type { ReportAnalysisOutput } from "@/lib/report/report-analysis/report-analysis-schema";
import type { ReportCompareMode, ReportPeriodPreset } from "@/lib/report/date-ranges";

export type ReportAnalysisStatus =
  | "idle"
  | "loading"
  | "retrying"
  | "success"
  | "error"
  | "stale";

export type ReportAnalysisError = {
  message: string;
  code?: string;
};

function fmtYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildCacheKey(input: {
  preset: ReportPeriodPreset;
  compareMode: ReportCompareMode;
  periodStart: string;
  periodEnd: string;
  snapshotFingerprint: string;
}): string {
  return `${input.preset}:${input.compareMode}:${input.periodStart}:${input.periodEnd}:${input.snapshotFingerprint}`;
}

export type UseReportAnalysisInput = BuildReportAnalysisContextInput & {
  snapshotFingerprint: string;
  perfReady: boolean;
};

export function useReportAnalysis(input: UseReportAnalysisInput) {
  const {
    preset,
    compareMode,
    filterRange,
    compareRange,
    model,
    perf,
    integrityView,
    tops,
    diaryEntries,
    snapshotFingerprint,
    perfReady,
  } = input;

  const cacheKey = useMemo(
    () =>
      buildCacheKey({
        preset,
        compareMode,
        periodStart: fmtYmd(filterRange.start),
        periodEnd: fmtYmd(filterRange.end),
        snapshotFingerprint,
      }),
    [preset, compareMode, filterRange.start, filterRange.end, snapshotFingerprint],
  );

  const context = useMemo(() => {
    if (!perfReady || !perf) return null;
    return buildReportAnalysisContext({
      preset,
      compareMode,
      filterRange,
      compareRange,
      model,
      perf,
      integrityView,
      tops,
      diaryEntries,
    });
  }, [perfReady, perf, preset, compareMode, filterRange, compareRange, model, integrityView, tops, diaryEntries]);

  const [status, setStatus] = useState<ReportAnalysisStatus>("idle");
  const [data, setData] = useState<ReportAnalysisOutput | null>(null);
  const [error, setError] = useState<ReportAnalysisError | null>(null);

  useEffect(() => {
    if (!perfReady) return;

    const cached = readReportAnalysisCache(cacheKey);
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
      setData(cached);
      setStatus("success");
      setError(null);
      return;
    }

    setData((prev) => {
      if (prev) {
        setStatus("stale");
        return prev;
      }
      setStatus("idle");
      return null;
    });
  }, [cacheKey, perfReady]);

  const fetchAnalysis = useCallback(
    async (mode: "generate" | "retry") => {
      if (!context) return;
      setStatus(mode === "retry" ? "retrying" : "loading");
      setError(null);

      try {
        const res = await fetch("/api/report/analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ context, snapshotFingerprint }),
        });

        const body = (await res.json()) as ReportAnalysisOutput & { error?: string; code?: string };

        if (!res.ok) {
          setStatus(data ? "stale" : "error");
          setError({
            message: body.error ?? "Generazione analisi non riuscita.",
            code: body.code,
          });
          return;
        }

        setData(body);
        writeReportAnalysisCache(cacheKey, body);
        setStatus("success");
      } catch {
        setStatus(data ? "stale" : "error");
        setError({ message: "Errore di rete. Controlla la connessione e riprova." });
      }
    },
    [context, snapshotFingerprint, cacheKey, data],
  );

  const generate = useCallback(() => fetchAnalysis("generate"), [fetchAnalysis]);
  const retry = useCallback(() => fetchAnalysis("retry"), [fetchAnalysis]);

  const canGenerate = Boolean(context) && status !== "loading" && status !== "retrying";

  return {
    status,
    data,
    error,
    generate,
    retry,
    canGenerate,
    isStale: status === "stale",
    isLoading: status === "loading" || status === "retrying",
  };
}
