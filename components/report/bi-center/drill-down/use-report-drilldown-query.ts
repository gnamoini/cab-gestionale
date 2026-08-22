"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { ListCursor } from "@/lib/domain/list-types";
import type { ReportDrillDownRequest, ReportDrillDownResponse } from "@/lib/report/drilldown/types";

async function fetchDrilldownPage(body: ReportDrillDownRequest): Promise<ReportDrillDownResponse> {
  const res = await fetch("/api/report/drilldown", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Drill-down ${res.status}`);
  }
  return res.json() as Promise<ReportDrillDownResponse>;
}

export function useReportDrilldownQuery(
  request: ReportDrillDownRequest | null,
  enabled: boolean,
) {
  return useInfiniteQuery({
    queryKey: ["report-drilldown", request],
    enabled: enabled && request != null,
    initialPageParam: null as ListCursor | null,
    queryFn: ({ pageParam }) =>
      fetchDrilldownPage({
        ...(request as ReportDrillDownRequest),
        cursor: pageParam,
      }),
    getNextPageParam: (last) =>
      last.page?.pageInfo.hasNextPage ? last.page.pageInfo.nextCursor : undefined,
  });
}
