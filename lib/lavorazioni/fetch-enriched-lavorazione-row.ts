import { LAVORAZIONI_COLUMNS, MEZZI_LIST_EMBED_COLUMNS } from "@/lib/db/table-select-columns";
import { mapLavorazioneLightToListRow } from "@/lib/db/dto-mappers";
import { applyLavorazioniNotDeletedFilter } from "@/lib/lavorazioni/lavorazioni-soft-delete";
import { enrichLavorazioniListRowsWithAttrezzature } from "@/lib/mezzi/mezzi-attrezzature-batch";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneRow } from "@/src/types/supabase-tables";
import type { SupabaseClient } from "@supabase/supabase-js";

const LAVORAZIONI_DETAIL_PROFILE_SELECT =
  "updated_by_profile:profiles!lavorazioni_updated_by_fkey(nome, cognome), created_by_profile:profiles!lavorazioni_created_by_fkey(nome, cognome)";

/** Fetch singola lavorazione + profili autore + embed mezzo telaio + batch attrezzature (SSOT read V2). */
export async function fetchEnrichedLavorazioneListRow(
  sb: SupabaseClient,
  lavorazioneId: string,
): Promise<LavorazioneListRow | null> {
  const id = lavorazioneId.trim();
  if (!id) return null;

  const { data, error } = await applyLavorazioniNotDeletedFilter(
    sb
      .from("lavorazioni")
      .select(`${LAVORAZIONI_COLUMNS}, ${LAVORAZIONI_DETAIL_PROFILE_SELECT}, mezzi(${MEZZI_LIST_EMBED_COLUMNS})`)
      .eq("id", id),
  ).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = mapLavorazioneLightToListRow(data as LavorazioneRow & { mezzi?: unknown }, { includeMezzo: true });

  const enriched = await enrichLavorazioniListRowsWithAttrezzature(sb, [row]);
  return enriched[0] ?? null;
}
