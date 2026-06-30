import "server-only";

import { LOG_MODIFICHE_WITH_PROFILE_SELECT } from "@/lib/db/table-select-columns";
import { LOG_MODIFICHE_RETENTION_PER_ENTITA } from "@/lib/gestionale-log/log-modifiche-retention";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { LogFilters } from "@/src/services/log.service";
import type { LogModificaWithProfileRow } from "@/src/types/supabase-tables";

/** Lettura log_modifiche lato server (prefetch dashboard BFF). */
export async function fetchLogModificheListServer(
  filters?: LogFilters,
): Promise<ServiceResult<LogModificaWithProfileRow[]>> {
  try {
    const sb = await createSupabaseServerUserClient();
    const effectiveLimit = Math.min(
      Math.max(filters?.limit ?? LOG_MODIFICHE_RETENTION_PER_ENTITA, 1),
      LOG_MODIFICHE_RETENTION_PER_ENTITA,
    );
    let q = sb
      .from("log_modifiche")
      .select(LOG_MODIFICHE_WITH_PROFILE_SELECT)
      .order("created_at", { ascending: false })
      .limit(effectiveLimit);
    if (filters?.entita) q = q.eq("entita", filters.entita);
    if (filters?.entita_id) q = q.eq("entita_id", filters.entita_id);
    const { data, error } = await q;
    if (error) return err(error.message);
    return success((data ?? []) as unknown as LogModificaWithProfileRow[]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore log";
    return err(msg);
  }
}
