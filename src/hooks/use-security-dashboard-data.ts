"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { isSupabasePublicEnvConfigured } from "@/lib/env/supabase-public";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { authService } from "@/src/services/auth.service";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import type { AuthLogAction, AuthLogWithProfileRow } from "@/src/types/supabase-tables";
import { useAuthLogsQuery } from "@/src/hooks/use-auth-logs-query";

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

function isSameLocalCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isTodayLocal(iso: string): boolean {
  return isSameLocalCalendarDay(new Date(iso), new Date());
}

function buildAggregates(rows: AuthLogWithProfileRow[]) {
  const recentLogins = rows.filter((r) => r.action === "login");
  const recentLoginFailed = rows.filter((r) => r.action === "login_failed");

  const activeTodayIds = new Set<string>();
  for (const r of rows) {
    if (!r.user_id) continue;
    if (r.action !== "login" && r.action !== "logout") continue;
    if (isTodayLocal(r.created_at)) activeTodayIds.add(r.user_id);
  }

  const lastByUser = new Map<
    string,
    { userId: string; nome: string; email: string; lastAt: string; lastAction: AuthLogAction }
  >();
  for (const r of rows) {
    if (!r.user_id) continue;
    if (r.action !== "login" && r.action !== "logout") continue;
    const nome = r.profiles?.nome?.trim() || r.email || "—";
    const cur = lastByUser.get(r.user_id);
    if (!cur || r.created_at > cur.lastAt) {
      lastByUser.set(r.user_id, {
        userId: r.user_id,
        nome,
        email: r.email,
        lastAt: r.created_at,
        lastAction: r.action,
      });
    }
  }
  const lastAccessPerUser = [...lastByUser.values()].sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));

  return {
    recentLogins,
    recentLoginFailed,
    activeTodayCount: activeTodayIds.size,
    activeTodayIds: [...activeTodayIds],
    lastAccessPerUser,
  };
}

export function useSecurityProfilesQuery(enabled: boolean) {
  return useQuery({
    queryKey: QK.authUsers,
    queryFn: async () => {
      const r = await authService.getAll();
      if (!r.success || !r.data) throw new Error(r.error ?? "Profili non disponibili");
      return r.data;
    },
    enabled,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/**
 * Dati aggregati per `/dashboard/security`: usa `useAuthLogsQuery` con profilo e filtri.
 */
export function useSecurityDashboardData(filters: SecurityDashboardFilters, opts?: { realtime?: boolean }) {
  const { status, user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.ruolo === "admin";
  const realtime = !!opts?.realtime;

  const dateFromIso = filters.dateFromYmd ? localDayStartIso(filters.dateFromYmd) : null;
  const dateToIso = filters.dateToYmd ? localDayEndIso(filters.dateToYmd) : null;

  const logsQ = useAuthLogsQuery({
    limit: 2500,
    withProfile: true,
    filterUserId: filters.filterUserId,
    dateFrom: dateFromIso,
    dateTo: dateToIso,
    enabled: isAuthSessionEstablished(status) && !!user?.id && isAdmin,
  });

  const aggregates = useMemo(() => buildAggregates(logsQ.data ?? []), [logsQ.data]);

  useEffect(() => {
    if (!realtime || !isAdmin || !isSupabasePublicEnvConfigured()) return;
    const sb = getBrowserSupabase();
    const channel = sb
      .channel("cab-auth-logs-security-rt")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "auth_logs" },
        () => {
          void qc.invalidateQueries({ queryKey: [...QK.authLogs] });
        },
      )
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [realtime, isAdmin, qc]);

  return { isAdmin, logsQuery: logsQ, ...aggregates };
}
