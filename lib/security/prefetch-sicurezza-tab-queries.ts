"use client";

import type { QueryClient } from "@tanstack/react-query";
import { listAuthLogsAdminAction, listRecentSecurityAuditAction } from "@/src/actions/security-read";
import { getPageMatrixAction } from "@/src/actions/security-roles-permissions";
import { QK } from "@/src/lib/react-query/invalidate-related";

export type SicurezzaTabId = "users" | "roles" | "monitoring" | "release";

function localDayStartIso(ymd: string): string {
  const [y, mo, d] = ymd.split("-").map(Number);
  return new Date(y, mo - 1, d, 0, 0, 0, 0).toISOString();
}

function localDayEndIso(ymd: string): string {
  const [y, mo, d] = ymd.split("-").map(Number);
  return new Date(y, mo - 1, d, 23, 59, 59, 999).toISOString();
}

/** Prefetch tab data prima del render (warm cache su navigazione tab). */
export function prefetchSicurezzaTabQueries(
  qc: QueryClient,
  tab: SicurezzaTabId,
  ctx: {
    userId?: string;
    dateFromYmd: string;
    dateToYmd: string;
    filterUserId: string | null;
  },
): void {
  if (tab === "roles") {
    void qc.prefetchQuery({
      queryKey: ["security", "page-matrix"],
      queryFn: async () => {
        const res = await getPageMatrixAction();
        if (!res.ok) throw new Error(res.message);
        return res.matrix;
      },
      staleTime: 60_000,
    });
    return;
  }
  if (tab !== "monitoring") return;

  const dateFromIso = localDayStartIso(ctx.dateFromYmd);
  const dateToIso = localDayEndIso(ctx.dateToYmd);
  void qc.prefetchQuery({
    queryKey: [
      ...QK.authLogs,
      "admin-action",
      ctx.userId ?? "anon",
      ctx.filterUserId,
      dateFromIso,
      dateToIso,
    ] as const,
    queryFn: async () => {
      const res = await listAuthLogsAdminAction({
        limit: 2500,
        filterUserId: ctx.filterUserId,
        dateFrom: dateFromIso,
        dateTo: dateToIso,
      });
      if (!res.ok) throw new Error(res.message);
      return res.rows;
    },
    staleTime: 120_000,
  });
  void qc.prefetchQuery({
    queryKey: [...QK.log, "security-recent"],
    queryFn: async () => {
      const res = await listRecentSecurityAuditAction();
      if (!res.ok) throw new Error(res.message);
      return res.rows;
    },
    staleTime: 120_000,
  });
}
