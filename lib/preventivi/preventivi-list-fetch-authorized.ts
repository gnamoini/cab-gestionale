import {
  fetchPreventiviListRows,
  mapPreventiviEmbedRowsToRecords,
  mezziRowsFromPreventiviEmbed,
  type PreventivoRowWithMezzoEmbed,
  type PreventiviRecordsPayload,
} from "@/lib/preventivi/preventivi-list-fetch";
import { ensureSectionRead } from "@/src/lib/auth/permission-guards";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import type { PreventiviFilters } from "@/src/services/preventivi.service";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

export type { PreventiviRecordsPayload };

export async function fetchPreventiviRecordsAuthorized(
  filters?: PreventiviFilters,
): Promise<ServiceResult<PreventiviRecordsPayload>> {
  try {
    const allowed = await ensureSectionRead("preventivi");
    if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
    const sb = await getBrowserSupabase();
    const rowsRes = await fetchPreventiviListRows(sb, filters);
    if (!rowsRes.success) return err(rowsRes.error ?? "Lettura preventivi non riuscita.");
    const rows = rowsRes.data ?? [];
    return success({
      records: mapPreventiviEmbedRowsToRecords(rows),
      mezziRows: mezziRowsFromPreventiviEmbed(rows),
    });
  } catch (e) {
    return serviceFailFromError(e);
  }
}

/** Righe grezze con embed — per test o migrazione. */
export async function fetchPreventiviEmbedRowsAuthorized(
  filters?: PreventiviFilters,
): Promise<ServiceResult<PreventivoRowWithMezzoEmbed[]>> {
  try {
    const allowed = await ensureSectionRead("preventivi");
    if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
    const sb = await getBrowserSupabase();
    return fetchPreventiviListRows(sb, filters);
  } catch (e) {
    return serviceFailFromError(e);
  }
}
