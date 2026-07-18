"use client";

import { useQuery } from "@tanstack/react-query";
import type { HealthScoreWeeklyTrendPoint } from "@/components/dashboard/dashboard-health-score-trend-chart";
import { GESTIONALE_REPORT_STALE_MS } from "@/lib/react-query/query-layer-policies";
import { useViewQueryOpts } from "@/lib/view/view-query-opts";

const HISTORY_WEEKS = 26;

type HealthScoreHistoryApiResponse = {
  points: HealthScoreWeeklyTrendPoint[];
  meta?: { weeks: number; computedAt: string };
  error?: string;
};

async function fetchHealthScoreHistory(weeks: number): Promise<HealthScoreHistoryApiResponse> {
  const res = await fetch(`/api/dashboard/health-score/history?weeks=${weeks}`, {
    credentials: "include",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Storico Health Score non disponibile");
  }
  return res.json() as Promise<HealthScoreHistoryApiResponse>;
}

export function useOperationalHealthScoreHistory(enabled: boolean) {
  const viewOpts = useViewQueryOpts();
  const q = useQuery({
    queryKey: ["dashboard", "health-score", "history", HISTORY_WEEKS] as const,
    queryFn: () => fetchHealthScoreHistory(HISTORY_WEEKS),
    enabled,
    staleTime: Math.max(viewOpts.staleTime, GESTIONALE_REPORT_STALE_MS),
    gcTime: viewOpts.gcTime,
    refetchOnWindowFocus: false,
    retry: false,
  });

  return {
    points: q.data?.points ?? null,
    isLoading: enabled && q.isPending,
    isError: q.isError,
  };
}
