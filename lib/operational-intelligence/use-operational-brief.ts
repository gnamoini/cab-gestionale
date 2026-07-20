"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReportCompareMode, ReportPeriodPreset } from "@/lib/report/date-ranges";
import type { DateRange } from "@/lib/report/date-ranges";
import { buildReportNarrativeSearchParams } from "@/lib/report/narrative/build-report-narrative-search-params";
import { operationalBriefOutputSchema } from "@/lib/operational-intelligence/brief/operational-brief-schema";
import type { OperationalBriefOutput } from "@/lib/operational-intelligence/types";
import type { ReportPayload } from "@/lib/report/contracts/report-payload";

export type UseOperationalBriefInput = {
  preset: ReportPeriodPreset;
  compareMode: ReportCompareMode;
  filterRange: DateRange;
  enabled: boolean;
};

export type UseOperationalBriefResult = {
  data: OperationalBriefOutput | null;
  correlationId: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useOperationalBrief(input: UseOperationalBriefInput): UseOperationalBriefResult {
  const { preset, compareMode, filterRange, enabled } = input;
  const [data, setData] = useState<OperationalBriefOutput | null>(null);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useMemo(
    () => buildReportNarrativeSearchParams({ preset, compareMode, filterRange }),
    [preset, compareMode, filterRange],
  );

  const periodKey = searchParams.toString();

  const fetchBrief = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/report/operational-brief?${periodKey}`);
      if (res.status === 404) {
        setData(null);
        setError("Brief operativo non disponibile");
        return;
      }
      const json = (await res.json()) as
        | ReportPayload<OperationalBriefOutput>
        | { error?: string; message?: string; correlationId?: string };

      if (!res.ok) {
        const errBody = json as { message?: string; error?: string; correlationId?: string };
        setError(errBody.message ?? errBody.error ?? `Errore ${res.status}`);
        setCorrelationId(errBody.correlationId ?? null);
        setData(null);
        return;
      }

      const payload = json as ReportPayload<OperationalBriefOutput>;
      const parsed = operationalBriefOutputSchema.parse(payload.data) as OperationalBriefOutput;
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
  }, [periodKey]);

  return {
    data,
    correlationId,
    loading,
    error,
    refetch: () => void fetchBrief(),
  };
}
