"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { computeSecurityAuthAggregates } from "@/lib/view/view-aggregation-cache";
import { useSecurityViewQueryOpts } from "@/lib/view/view-query-opts";
import { usePermissions } from "@/src/hooks/use-permissions";
import { listAuthLogsAdminAction } from "@/src/actions/security-read";
import { QK } from "@/src/lib/react-query/invalidate-related";

export type SecurityDashboardFilters = {
  /** yyyy-mm-dd locale, null = nessun limite inferiore */
  dateFromYmd: string | null;
  dateToYmd: string | null;
  filterUserId: string | null;
};

function localDayStartIso(ymd: string): string {
  const [y, mo, d] = ymd.split("-").map(Number);
  return new Date(y, mo - 1, d, 0, 0, 0, 0).toISOString();
}

function localDayEndIso(ymd: string): string {
  const [y, mo, d] = ymd.split("-").map(Number);
  return new Date(y, mo - 1, d, 23, 59, 59, 999).toISOString();
}

/**
 * Dati aggregati per `/sicurezza`: auth logs via server action admin.
 */
export function useSecurityDashboardData(
  filters: SecurityDashboardFilters,
  opts?: { enabled?: boolean },
) {
  const { status, user } = useAuth();
  const permissions = usePermissions();
  const securityOpts = useSecurityViewQueryOpts({ staleTime: 120_000 });
  const isAdmin = permissions.canManageSecurity;
  const tabEnabled = opts?.enabled !== false;

  const dateFromIso = filters.dateFromYmd ? localDayStartIso(filters.dateFromYmd) : null;
  const dateToIso = filters.dateToYmd ? localDayEndIso(filters.dateToYmd) : null;

  const logsQ = useQuery({
    queryKey: [
      ...QK.authLogs,
      "admin-action",
      user?.id ?? "anon",
      filters.filterUserId,
      dateFromIso,
      dateToIso,
    ] as const,
    queryFn: async () => {
      const res = await listAuthLogsAdminAction({
        limit: 2500,
        filterUserId: filters.filterUserId,
        dateFrom: dateFromIso,
        dateTo: dateToIso,
      });
      if (!res.ok) throw new Error(res.message);
      return res.rows;
    },
    enabled: isAuthSessionEstablished(status) && !!user?.id && isAdmin && tabEnabled,
    staleTime: securityOpts.staleTime,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  const aggregates = useMemo(() => computeSecurityAuthAggregates(logsQ.data ?? []), [logsQ.data]);

  return { isAdmin, logsQuery: logsQ, ...aggregates };
}
