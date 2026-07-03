import type { SupabaseClient } from "@supabase/supabase-js";
import { enrichLavorazioneListRowsWithMezzi, mezziRowsToIdMap } from "@/lib/db/dto-mappers";
import { MEZZI_LIST_EMBED_COLUMNS } from "@/lib/db/table-select-columns";
import { enrichLavorazioniListRowsWithAttrezzature } from "@/lib/mezzi/mezzi-attrezzature-batch";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { MezzoRow } from "@/src/types/supabase-tables";

/** PR-5 — batch mezzo embed after list fetch (flag-gated at call site). */
export async function lazyEmbedMezziOnLavorazioniListRows(
  sb: SupabaseClient,
  rows: readonly LavorazioneListRow[],
): Promise<LavorazioneListRow[]> {
  const mezzoIds = [...new Set(rows.map((r) => r.mezzo_id?.trim()).filter(Boolean))] as string[];
  if (mezzoIds.length === 0) return [...rows];

  const { data, error } = await sb.from("mezzi").select(MEZZI_LIST_EMBED_COLUMNS).in("id", mezzoIds);
  if (error) throw new Error(error.message);

  const mezziById = mezziRowsToIdMap((data ?? []) as MezzoRow[]);
  let enriched = enrichLavorazioneListRowsWithMezzi(rows, mezziById);
  enriched = await enrichLavorazioniListRowsWithAttrezzature(sb, enriched);
  return enriched;
}
