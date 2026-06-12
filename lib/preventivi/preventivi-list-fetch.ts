import { MEZZI_LIST_LIGHT_COLUMNS, PREVENTIVI_COLUMNS } from "@/lib/db/table-select-columns";
import { embedMezzoDto } from "@/lib/db/dto-mappers";
import { preventivoRowToRecord } from "@/lib/preventivi/preventivi-db-mapper";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import type { PreventiviFilters } from "@/src/services/preventivi.service";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { MezzoRow, PreventivoRow } from "@/src/types/supabase-tables";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PreventiviRecordsPayload = {
  records: PreventivoRecord[];
  mezziRows: MezzoRow[];
};

export type PreventivoRowWithMezzoEmbed = PreventivoRow & { mezzi?: unknown };

const PREVENTIVI_LIST_SELECT = `${PREVENTIVI_COLUMNS}, mezzi(${MEZZI_LIST_LIGHT_COLUMNS})` as const;

/** Righe preventivi con embed mezzo — 1 query Supabase. */
export async function fetchPreventiviListRows(
  sb: SupabaseClient,
  filters?: PreventiviFilters,
): Promise<ServiceResult<PreventivoRowWithMezzoEmbed[]>> {
  let q = sb.from("preventivi").select(PREVENTIVI_LIST_SELECT).order("created_at", { ascending: false });
  if (filters?.mezzo_id) q = q.eq("mezzo_id", filters.mezzo_id);
  if (filters?.lavorazione_id) q = q.eq("lavorazione_id", filters.lavorazione_id);
  if (filters?.cliente?.trim()) q = q.ilike("cliente", `%${filters.cliente.trim()}%`);
  const { data, error } = await q;
  if (error) return err(error.message);
  return success((data ?? []) as PreventivoRowWithMezzoEmbed[]);
}

export function mapPreventiviEmbedRowsToRecords(rows: readonly PreventivoRowWithMezzoEmbed[]): PreventivoRecord[] {
  return rows
    .map((row) => {
      const mezzo = embedMezzoDto(row.mezzi);
      return preventivoRowToRecord(row, mezzo);
    })
    .sort((a, b) => new Date(b.dataCreazione).getTime() - new Date(a.dataCreazione).getTime());
}

export function mezziRowsFromPreventiviEmbed(rows: readonly PreventivoRowWithMezzoEmbed[]): MezzoRow[] {
  const map = new Map<string, MezzoRow>();
  for (const row of rows) {
    const mezzo = embedMezzoDto(row.mezzi);
    if (mezzo?.id) map.set(mezzo.id, mezzo);
  }
  return [...map.values()];
}
