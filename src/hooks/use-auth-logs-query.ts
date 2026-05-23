"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { authLogsService } from "@/src/services/auth-logs.service";
import type { AuthLogRow, AuthLogWithProfileRow } from "@/src/types/supabase-tables";

export type AuthLogsQueryOpts = {
  limit?: number;
  /** Join `profiles` (dashboard sicurezza). */
  withProfile?: boolean;
  filterUserId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  enabled?: boolean;
  staleTime?: number;
};

function normalizeAuthLogsInput(input?: number | AuthLogsQueryOpts) {
  if (typeof input === "number") {
    return {
      limit: Math.min(Math.max(input, 1), 1000),
      withProfile: false,
      filterUserId: null as string | null,
      dateFrom: null as string | null,
      dateTo: null as string | null,
      enabled: true,
      staleTime: undefined as number | undefined,
    };
  }
  const o = input ?? {};
  return {
    limit: Math.min(Math.max(o.limit ?? 200, 1), 2500),
    withProfile: !!o.withProfile,
    filterUserId: o.filterUserId ?? null,
    dateFrom: o.dateFrom ?? null,
    dateTo: o.dateTo ?? null,
    enabled: o.enabled !== false,
    staleTime: o.staleTime,
  };
}

export function useAuthLogsQuery(limit?: number): UseQueryResult<AuthLogRow[], Error>;
export function useAuthLogsQuery(opts: AuthLogsQueryOpts): UseQueryResult<AuthLogWithProfileRow[], Error>;
export function useAuthLogsQuery(input?: number | AuthLogsQueryOpts): UseQueryResult<AuthLogRow[] | AuthLogWithProfileRow[], Error> {
  const { status, user } = useAuth();
  const p = normalizeAuthLogsInput(input);

  return useQuery({
    queryKey: [...QK.authLogs, user?.id ?? "anon", p.limit, p.withProfile, p.filterUserId, p.dateFrom, p.dateTo] as const,
    queryFn: async () => {
      if (p.withProfile) {
        const r = await authLogsService.listRecentWithProfile({
          limit: p.limit,
          userId: p.filterUserId,
          dateFrom: p.dateFrom,
          dateTo: p.dateTo,
        });
        if (r.error) throw new Error(r.error);
        return r.rows;
      }
      const r = await authLogsService.listRecent(p.limit);
      if (r.error) throw new Error(r.error);
      return r.rows;
    },
    enabled: isAuthSessionEstablished(status) && !!user?.id && p.enabled,
    staleTime: p.staleTime ?? 300_000,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}
