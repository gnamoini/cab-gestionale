"use client";

import { useMemo } from "react";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { computeSecurityAuthAggregates } from "@/lib/view/view-aggregation-cache";
import { useSecurityViewQueryOpts } from "@/lib/view/view-query-opts";
import { usePermissions } from "@/src/hooks/use-permissions";
import { useAuthLogsQuery } from "@/src/hooks/use-auth-logs-query";
import { authService } from "@/src/services/auth.service";
import { useQuery } from "@tanstack/react-query";
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

export function useSecurityProfilesQuery(enabled: boolean) {
  const securityOpts = useSecurityViewQueryOpts();
  return useQuery({
    queryKey: QK.authUsers,
    queryFn: async () => {
      const r = await authService.getAll();
      if (!r.success || !r.data) throw new Error(r.error ?? "Profili non disponibili");
      return r.data;
    },
    enabled,
    ...securityOpts,
  });
}

/**
 * Dati aggregati per `/dashboard/security`: read-heavy VIEW layer (no subscription Realtime dedicata).
 */
export function useSecurityDashboardData(filters: SecurityDashboardFilters) {
  const { status, user } = useAuth();
  const permissions = usePermissions();
  const securityOpts = useSecurityViewQueryOpts({ staleTime: 120_000 });
  const isAdmin = permissions.canManageSecurity;

  const dateFromIso = filters.dateFromYmd ? localDayStartIso(filters.dateFromYmd) : null;
  const dateToIso = filters.dateToYmd ? localDayEndIso(filters.dateToYmd) : null;

  const logsQ = useAuthLogsQuery({
    limit: 2500,
    withProfile: true,
    filterUserId: filters.filterUserId,
    dateFrom: dateFromIso,
    dateTo: dateToIso,
    enabled: isAuthSessionEstablished(status) && !!user?.id && isAdmin,
    staleTime: securityOpts.staleTime,
  });

  const aggregates = useMemo(() => computeSecurityAuthAggregates(logsQ.data ?? []), [logsQ.data]);

  return { isAdmin, logsQuery: logsQ, ...aggregates };
}
