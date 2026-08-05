import "server-only";

import { LOG_MODIFICHE_WITH_PROFILE_SELECT } from "@/lib/db/table-select-columns";
import { DEFAULT_AUDIT_RETENTION_CONFIG } from "@/lib/audit/types";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { LogModificaWithProfileRow } from "@/src/types/supabase-tables";

export type ActivityFeedFilters = {
  limit?: number;
  days?: number;
};

/** ACTIVITY_FEED — ultimi eventi globali (RPC get_activity_feed + join profilo). */
export async function fetchActivityFeedServer(
  filters?: ActivityFeedFilters,
): Promise<ServiceResult<LogModificaWithProfileRow[]>> {
  try {
    const sb = await createSupabaseServerUserClient();
    const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 100);
    const days = filters?.days ?? DEFAULT_AUDIT_RETENTION_CONFIG.dashboard_days;

    const { data: feedRows, error: rpcErr } = await sb.rpc("get_activity_feed", {
      p_limit: limit,
      p_days: days,
    });
    if (rpcErr) return err(rpcErr.message);
    const ids = (feedRows ?? []).map((r: { id: string }) => r.id).filter(Boolean);
    if (ids.length === 0) return success([]);

    const { data, error } = await sb
      .from("log_modifiche")
      .select(LOG_MODIFICHE_WITH_PROFILE_SELECT)
      .in("id", ids)
      .order("created_at", { ascending: false });
    if (error) return err(error.message);
    return success((data ?? []) as unknown as LogModificaWithProfileRow[]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore activity feed";
    return err(msg);
  }
}
