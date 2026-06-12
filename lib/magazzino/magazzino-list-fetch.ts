import {
  MAGAZZINO_REPORT_LIGHT_COLUMNS,
  MAGAZZINO_RICAMBI_COLUMNS,
} from "@/lib/db/table-select-columns";
import type { MagazzinoFilters } from "@/src/services/magazzino.service";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";
import type { SupabaseClient } from "@supabase/supabase-js";

export type MagazzinoListVariant = "list" | "report";

function applyMagazzinoFilters<T extends { ilike: (col: string, pat: string) => T }>(
  q: T,
  filters?: MagazzinoFilters,
): T {
  let query = q;
  if (filters?.codice?.trim()) query = query.ilike("codice", `%${filters.codice.trim()}%`);
  if (filters?.nome?.trim()) query = query.ilike("nome", `%${filters.nome.trim()}%`);
  if (filters?.marca?.trim()) query = query.ilike("marca", `%${filters.marca.trim()}%`);
  return query;
}

/** Fetch puro magazzino — injectable server/client Supabase. */
export async function fetchMagazzinoListRows(
  sb: SupabaseClient,
  options?: { filters?: MagazzinoFilters; variant?: MagazzinoListVariant },
): Promise<ServiceResult<MagazzinoRicambioRow[]>> {
  const variant = options?.variant ?? "list";
  const columns = variant === "report" ? MAGAZZINO_REPORT_LIGHT_COLUMNS : MAGAZZINO_RICAMBI_COLUMNS;
  let q = sb.from("magazzino_ricambi").select(columns).order("codice", { ascending: true });
  q = applyMagazzinoFilters(q, options?.filters);
  const { data, error } = await q;
  if (error) return err(error.message);
  return success((data ?? []) as MagazzinoRicambioRow[]);
}
