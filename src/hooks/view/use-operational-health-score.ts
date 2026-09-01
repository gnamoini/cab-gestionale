"use client";

import { useQuery } from "@tanstack/react-query";
import type { OperationalHealthScore } from "@/lib/dashboard/operational-health-score";
import { GESTIONALE_REPORT_STALE_MS } from "@/lib/react-query/query-layer-policies";
import { useViewQueryOpts } from "@/lib/view/view-query-opts";

type HealthScoreApiResponse = {
  status: "READY" | "CALCULATING" | "STALE" | "FAILED";
  score: OperationalHealthScore | null;
  meta?: Record<string, unknown>;
  error?: string;
};

async function fetchHealthScoreV2(): Promise<HealthScoreApiResponse> {
  const res = await fetch("/api/dashboard/health-score", { credentials: "include" });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Health Score non disponibile");
  }
  return res.json() as Promise<HealthScoreApiResponse>;
}

export function useOperationalHealthScore() {
  const viewOpts = useViewQueryOpts();
  const q = useQuery({
    queryKey: ["dashboard", "health-score", "v2"] as const,
    queryFn: fetchHealthScoreV2,
    staleTime: Math.max(viewOpts.staleTime, GESTIONALE_REPORT_STALE_MS),
    gcTime: viewOpts.gcTime,
    refetchOnWindowFocus: false,
    retry: false,
  });

  return {
    score: q.data?.score ?? null,
    isLoading: q.isPending,
    isError: q.isError,
    error: q.error instanceof Error ? q.error.message : null,
    insufficientData: !q.isPending && q.isSuccess && q.data?.score == null,
    status: q.data?.status,
  };
}
