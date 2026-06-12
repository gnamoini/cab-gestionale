import {
  MEZZI_LIST_LIGHT_COLUMNS,
  MEZZI_REPORT_LIGHT_COLUMNS,
} from "@/lib/db/table-select-columns";
import { mapMezzoLightToRow } from "@/lib/db/dto-mappers";
import type { MezzoFilters } from "@/src/services/mezzi.service";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { MezzoRow } from "@/src/types/supabase-tables";
import type { SupabaseClient } from "@supabase/supabase-js";

export type MezziListVariant = "list" | "report";

function applyMezzoFilters<T extends { ilike: (col: string, pat: string) => T; or: (f: string) => T }>(
  q: T,
  filters?: MezzoFilters,
): T {
  let query = q;
  if (filters?.cliente?.trim()) query = query.ilike("cliente", `%${filters.cliente.trim()}%`);
  if (filters?.marca?.trim()) query = query.ilike("marca", `%${filters.marca.trim()}%`);
  if (filters?.modello?.trim()) query = query.ilike("modello", `%${filters.modello.trim()}%`);
  if (filters?.targa?.trim()) query = query.ilike("targa", `%${filters.targa.trim()}%`);
  if (filters?.numero_scuderia?.trim()) {
    query = query.ilike("numero_scuderia", `%${filters.numero_scuderia.trim()}%`);
  }
  if (filters?.search?.trim()) {
    const s = filters.search.trim();
    query = query.or(
      `cliente.ilike.%${s}%,marca.ilike.%${s}%,modello.ilike.%${s}%,targa.ilike.%${s}%,matricola.ilike.%${s}%,numero_scuderia.ilike.%${s}%`,
    );
  }
  return query;
}

/** Fetch puro mezzi — injectable server/client Supabase. */
export async function fetchMezziListRows(
  sb: SupabaseClient,
  options?: { filters?: MezzoFilters; variant?: MezziListVariant },
): Promise<ServiceResult<MezzoRow[]>> {
  const variant = options?.variant ?? "list";
  const columns = variant === "report" ? MEZZI_REPORT_LIGHT_COLUMNS : MEZZI_LIST_LIGHT_COLUMNS;
  let q = sb.from("mezzi").select(columns).order("created_at", { ascending: false });
  q = applyMezzoFilters(q, options?.filters);
  const { data, error } = await q;
  if (error) return err(error.message);
  return success(((data ?? []) as unknown as MezzoRow[]).map(mapMezzoLightToRow));
}
