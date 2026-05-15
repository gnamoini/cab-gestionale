"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import type { AuthLogAction, AuthLogRow, AuthLogWithProfileRow } from "@/src/types/supabase-tables";

export type AuthLogsListFilters = {
  limit?: number;
  userId?: string | null;
  /** ISO 8601 inclusivo (inizio fascia). */
  dateFrom?: string | null;
  /** ISO 8601 inclusivo (fine fascia). */
  dateTo?: string | null;
};

function clientUserAgent(): string | null {
  if (typeof navigator === "undefined" || !navigator.userAgent) return null;
  const ua = navigator.userAgent.trim();
  return ua.length > 0 ? ua.slice(0, 2000) : null;
}

/**
 * Inserimenti su `auth_logs` senza bloccare il flusso auth (errori ignorati).
 * IP non disponibile dal browser: lasciato null (eventuale arricchimento server-side in futuro).
 */
export const authLogsService = {
  logLoginFireAndForget(userId: string, email: string): void {
    void (async () => {
      try {
        const sb = getBrowserSupabase();
        const { error } = await sb.from("auth_logs").insert({
          user_id: userId,
          email: email.trim().toLowerCase(),
          action: "login" as AuthLogAction,
          ip: null,
          user_agent: clientUserAgent(),
        });
        if (error) console.warn("[auth_logs] login:", error.message);
      } catch {
        /* ignore */
      }
    })();
  },

  logLogoutFireAndForget(userId: string, email: string): void {
    void (async () => {
      try {
        const sb = getBrowserSupabase();
        const { error } = await sb.from("auth_logs").insert({
          user_id: userId,
          email: email.trim().toLowerCase(),
          action: "logout" as AuthLogAction,
          ip: null,
          user_agent: clientUserAgent(),
        });
        if (error) console.warn("[auth_logs] logout:", error.message);
      } catch {
        /* ignore */
      }
    })();
  },

  logLoginFailedFireAndForget(email: string): void {
    const e = email.trim().toLowerCase();
    void (async () => {
      try {
        const sb = getBrowserSupabase();
        const { error } = await sb.from("auth_logs").insert({
          user_id: null,
          email: e || "unknown",
          action: "login_failed" as AuthLogAction,
          ip: null,
          user_agent: clientUserAgent(),
        });
        if (error) console.warn("[auth_logs] login_failed:", error.message);
      } catch {
        /* ignore */
      }
    })();
  },

  async listRecent(limit = 200): Promise<{ rows: AuthLogRow[]; error: string | null }> {
    try {
      const sb = getBrowserSupabase();
      const lim = Math.min(Math.max(limit, 1), 1000);
      const { data, error } = await sb.from("auth_logs").select("*").order("created_at", { ascending: false }).limit(lim);
      if (error) return { rows: [], error: error.message };
      return { rows: (data ?? []) as AuthLogRow[], error: null };
    } catch (e) {
      return { rows: [], error: e instanceof Error ? e.message : "Errore lettura auth_logs" };
    }
  },

  /**
   * Lista per dashboard sicurezza (admin): join `profiles` per nome, filtri opzionali.
   * Limite massimo 2500 per evitare payload eccessivi.
   */
  async listRecentWithProfile(filters: AuthLogsListFilters = {}): Promise<{ rows: AuthLogWithProfileRow[]; error: string | null }> {
    try {
      const sb = getBrowserSupabase();
      const lim = Math.min(Math.max(filters.limit ?? 500, 1), 2500);
      let q = sb
        .from("auth_logs")
        .select(
          `
          *,
          profiles!auth_logs_user_id_fkey (
            id,
            nome
          )
        `,
        )
        .order("created_at", { ascending: false })
        .limit(lim);
      if (filters.dateFrom) q = q.gte("created_at", filters.dateFrom);
      if (filters.dateTo) q = q.lte("created_at", filters.dateTo);
      if (filters.userId) q = q.eq("user_id", filters.userId);
      const { data, error } = await q;
      if (error) return { rows: [], error: error.message };
      return { rows: (data ?? []) as AuthLogWithProfileRow[], error: null };
    } catch (e) {
      return { rows: [], error: e instanceof Error ? e.message : "Errore lettura auth_logs" };
    }
  },
};
