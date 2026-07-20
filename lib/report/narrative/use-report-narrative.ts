"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReportCompareMode, ReportPeriodPreset } from "@/lib/report/date-ranges";
import type { DateRange } from "@/lib/report/date-ranges";
import { buildReportNarrativeSearchParams } from "@/lib/report/narrative/build-report-narrative-search-params";
import { generatedNarrativeDtoSchema } from "@/lib/report/narrative/narrative-schema";
import type { GeneratedNarrativeDto } from "@/lib/report/narrative/types";
import type { ReportPayload } from "@/lib/report/contracts/report-payload";

export type UseReportNarrativeInput = {
  preset: ReportPeriodPreset;
  compareMode: ReportCompareMode;
  filterRange: DateRange;
  enabled: boolean;
};

export type UseReportNarrativeResult = {
  data: GeneratedNarrativeDto | null;
  correlationId: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useReportNarrative(input: UseReportNarrativeInput): UseReportNarrativeResult {
  const { preset, compareMode, filterRange, enabled } = input;
  const [data, setData] = useState<GeneratedNarrativeDto | null>(null);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const consumedRef = useRef(false);

  const searchParams = useMemo(
    () => buildReportNarrativeSearchParams({ preset, compareMode, filterRange }),
    [preset, compareMode, filterRange],
  );

  const periodKey = searchParams.toString();

  const fetchNarrative = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    consumedRef.current = false;

    try {
      const res = await fetch(`/api/report/narrative?${periodKey}`);
      if (res.status === 404) {
        setData(null);
        setError("Analisi narrativa non disponibile");
        return;
      }
      const json = (await res.json()) as
        | ReportPayload<GeneratedNarrativeDto>
        | { error?: string; message?: string; correlationId?: string };

      if (!res.ok) {
        const errBody = json as { message?: string; error?: string; correlationId?: string };
        setError(errBody.message ?? errBody.error ?? `Errore ${res.status}`);
        setCorrelationId(errBody.correlationId ?? null);
        setData(null);
        return;
      }

      const payload = json as ReportPayload<GeneratedNarrativeDto>;
      const parsed = generatedNarrativeDtoSchema.parse(payload.data);
      setData(parsed);
      setCorrelationId(payload.metadata.correlationId ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore di rete");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, periodKey]);

  useEffect(() => {
    setData(null);
    setError(null);
    setCorrelationId(null);
    consumedRef.current = false;
  }, [periodKey]);

  useEffect(() => {
    if (!data || !correlationId || consumedRef.current) return;
    consumedRef.current = true;
    const dedupeKey = `${periodKey}:${data.generatedAt}`;
    void fetch("/api/report/narrative/consumed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correlationId, dedupeKey }),
    });
  }, [data, correlationId, periodKey]);

  return {
    data,
    correlationId,
    loading,
    error,
    refetch: () => void fetchNarrative(),
  };
}
