import { MOVIMENTI_RICAMBI_COLUMNS } from "@/lib/db/table-select-columns";
import type { MovimentiFilters } from "@/src/services/movimenti.service";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { MovimentoRicambioRow } from "@/src/types/supabase-tables";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Fetch puro movimenti — injectable server/client Supabase. */
export async function fetchMovimentiListRows(
  sb: SupabaseClient,
  filters?: MovimentiFilters,
): Promise<ServiceResult<MovimentoRicambioRow[]>> {
  const mezzoId = filters?.mezzo_id?.trim() ?? "";
  if (mezzoId) {
    const { data, error } = await sb
      .from("movimenti_ricambi")
      .select(`${MOVIMENTI_RICAMBI_COLUMNS}, lavorazioni!inner(mezzo_id)`)
      .eq("lavorazioni.mezzo_id", mezzoId)
      .order("created_at", { ascending: false });
    if (error) return err(error.message);
    return success((data ?? []) as MovimentoRicambioRow[]);
  }

  let q = sb.from("movimenti_ricambi").select(MOVIMENTI_RICAMBI_COLUMNS).order("created_at", { ascending: false });
  if (filters?.ricambio_id) q = q.eq("ricambio_id", filters.ricambio_id);
  if (filters?.lavorazione_id) q = q.eq("lavorazione_id", filters.lavorazione_id);
  else if (filters?.lavorazione_ids?.length) q = q.in("lavorazione_id", filters.lavorazione_ids);
  if (filters?.tipo) q = q.eq("tipo", filters.tipo);
  const { data, error } = await q;
  if (error) return err(error.message);
  return success((data ?? []) as MovimentoRicambioRow[]);
}
