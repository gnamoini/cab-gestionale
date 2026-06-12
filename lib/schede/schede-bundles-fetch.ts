import { SCHEDA_LAVORAZIONE_COLUMNS } from "@/lib/db/table-select-columns";
import { schedaRowsToBundle, schedaRowsToStore } from "@/lib/schede/schede-db-mapper";
import type { LavorazioneSchedeBundle, LavorazioneSchedeStore } from "@/types/schede";
import type { SchedaLavorazioneRow } from "@/src/types/supabase-tables";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Max UUID per singola query `.in()` — evita URL troppo lunghi. */
export const SCHEde_BATCH_IN_CHUNK = 80;

function uniqueIds(lavorazioneIds: readonly string[]): string[] {
  return [...new Set(lavorazioneIds.map((id) => id.trim()).filter(Boolean))];
}

/** Fetch batch righe schede — 1 query Supabase per chunk (sostituisce N× getAll per id). */
export async function fetchSchedeRowsByLavorazioneIds(
  sb: SupabaseClient,
  lavorazioneIds: readonly string[],
): Promise<ServiceResult<SchedaLavorazioneRow[]>> {
  const ids = uniqueIds(lavorazioneIds);
  if (ids.length === 0) return success([]);

  const allRows: SchedaLavorazioneRow[] = [];
  for (let i = 0; i < ids.length; i += SCHEde_BATCH_IN_CHUNK) {
    const chunk = ids.slice(i, i + SCHEde_BATCH_IN_CHUNK);
    const { data, error } = await sb
      .from("scheda_lavorazione")
      .select(SCHEDA_LAVORAZIONE_COLUMNS)
      .in("lavorazione_id", chunk);
    if (error) return err(error.message);
    allRows.push(...((data ?? []) as SchedaLavorazioneRow[]));
  }
  return success(allRows);
}

/** Righe → store bundle per-id (nessun IO). */
export function schedeRowsToBundlesStore(
  rows: readonly SchedaLavorazioneRow[],
  requestedIds: readonly string[],
): LavorazioneSchedeStore {
  const fullStore = schedaRowsToStore(rows);
  const ids = uniqueIds(requestedIds);
  const store: LavorazioneSchedeStore = {};
  for (const id of ids) {
    if (fullStore[id]) store[id] = fullStore[id];
  }
  return store;
}

/** Batch fetch → `LavorazioneSchedeStore` (1–⌈N/80⌉ query). */
export async function fetchSchedeBundlesStore(
  sb: SupabaseClient,
  lavorazioneIds: readonly string[],
  codiciByLavorazioneId?: Readonly<Record<string, string | null | undefined>>,
): Promise<ServiceResult<LavorazioneSchedeStore>> {
  const ids = uniqueIds(lavorazioneIds);
  if (ids.length === 0) return success({});

  const rowsRes = await fetchSchedeRowsByLavorazioneIds(sb, ids);
  if (!rowsRes.success) return err(rowsRes.error ?? "Lettura schede non riuscita.");

  const byLav = new Map<string, SchedaLavorazioneRow[]>();
  for (const row of rowsRes.data ?? []) {
    const list = byLav.get(row.lavorazione_id) ?? [];
    list.push(row);
    byLav.set(row.lavorazione_id, list);
  }

  const store: LavorazioneSchedeStore = {};
  for (const id of ids) {
    const list = byLav.get(id) ?? [];
    const codice = codiciByLavorazioneId?.[id];
    store[id] = schedaRowsToBundle(id, list, codice);
  }
  return success(store);
}
