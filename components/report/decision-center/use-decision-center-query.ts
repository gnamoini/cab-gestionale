"use client";

import { useQuery } from "@tanstack/react-query";
import { useReportPeriodContext } from "@/components/report/context/report-period-context";
import { ymdFromDate } from "@/lib/report/date-ranges";
import type { DecisionCenterDto } from "@/lib/report/decision-center/types";
import type { ReportPayload } from "@/lib/report/contracts/report-payload";

function buildUrl(range: { start: Date; end: Date }, compareMode: string): string {
  const params = new URLSearchParams({
    preset: "custom",
    from: ymdFromDate(range.start),
    to: ymdFromDate(range.end),
    compareMode,
  });
  return `/api/report/decision-center?${params.toString()}`;
}

export function useDecisionCenterQuery(enabled: boolean) {
  const { range, compareMode } = useReportPeriodContext();
  return useQuery({
    queryKey: ["decision-center", ymdFromDate(range.start), ymdFromDate(range.end), compareMode],
    enabled,
    staleTime: 30_000,
    queryFn: async ({ signal }) => {
      const res = await fetch(buildUrl(range, compareMode), { signal, credentials: "same-origin" });
      if (!res.ok) throw new Error(`Errore ${res.status}`);
      const payload = (await res.json()) as ReportPayload<DecisionCenterDto>;
      return payload.data;
    },
  });
}

export async function patchDecisionStatus(
  id: string,
  status: string,
  conditionHash?: string,
): Promise<void> {
  const res = await fetch(`/api/report/decision-center/${encodeURIComponent(id)}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, conditionHash }),
  });
  if (!res.ok) throw new Error(`Errore ${res.status}`);
}
