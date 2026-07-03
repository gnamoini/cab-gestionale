import { rpcCursorFromPageParam, toLavorazioniPageFromRpc, type LavorazioniRpcListCursor, type LavorazioniRpcListPageRaw } from "@/lib/domain/list-mapper";
import type { Page } from "@/lib/domain/list-types";
import { normalizeLavorazioniFilters } from "@/lib/domain/normalize-filters";
import { toQueryParams } from "@/lib/domain/to-query-params";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { LavorazioneFilters, LavorazioneListRow } from "@/src/services/lavorazioni.service";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

function hasExtendedFilters(filters?: LavorazioneFilters): boolean {
  if (!filters) return false;
  return Boolean(
    filters.mezzo_id ||
      filters.priorita ||
      filters.stati_in?.length ||
      filters.data_ingresso_da ||
      filters.data_ingresso_a ||
      filters.data_uscita_da ||
      filters.data_uscita_a ||
      filters.data_uscita_is_null != null ||
      filters.includeMezzo ||
      filters.includeProfiles ||
      filters.fetchMode === "report" ||
      filters.fetchMode === "detail",
  );
}

/** Paginated RPC fetch — FilterContract fields only; extended filters → caller should use legacy. */
export async function fetchLavorazioniListPageRpc(
  filters: LavorazioneFilters | undefined,
  pageParam: LavorazioniRpcListCursor | null,
  options?: { clientPortal?: boolean },
): Promise<ServiceResult<Page<LavorazioneListRow>>> {
  if (hasExtendedFilters(filters)) {
    return err("RPC paginated list does not support extended filters yet");
  }
  if (options?.clientPortal) {
    return err("RPC paginated list does not support client portal yet");
  }
  try {
    const norm = normalizeLavorazioniFilters(filters);
    const params = rpcCursorFromPageParam(pageParam, toQueryParams(norm));
    const sb = await getBrowserSupabase();
    const { data, error } = await sb.rpc("list_lavorazioni_paginated", {
      p_mode: params.mode,
      p_limit: params.limit,
      p_cursor_created_at: params.cursor_created_at,
      p_cursor_id: params.cursor_id,
      p_search: params.search,
      p_stato: params.stato,
    });
    if (error) return err(error.message);
    const raw = data as LavorazioniRpcListPageRaw;
    const page = toLavorazioniPageFromRpc(
      {
        rows: Array.isArray(raw?.rows) ? raw.rows : [],
        next_cursor: raw?.next_cursor ?? null,
        total_estimate: raw?.total_estimate ?? null,
      },
      { includeMezzo: false, limit: params.limit },
    );
    return success(page);
  } catch (e) {
    return serviceFailFromError(e);
  }
}

export function getNextLavorazioniPageParam(
  lastPage: Page<LavorazioneListRow>,
): LavorazioniRpcListCursor | undefined {
  const cursor = lastPage.pageInfo.nextCursor;
  if (!cursor || !lastPage.pageInfo.hasNextPage) return undefined;
  const c = cursor as LavorazioniRpcListCursor;
  if (!c.created_at || !c.id) return undefined;
  return { created_at: String(c.created_at), id: String(c.id) };
}
