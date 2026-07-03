import { LAVORAZIONI_COLUMNS, MEZZI_LIST_EMBED_COLUMNS } from "@/lib/db/table-select-columns";
import { applyLavorazioniNotDeletedFilter } from "@/lib/lavorazioni/lavorazioni-soft-delete";
import { enrichLavorazioniListRowsWithAttrezzature } from "@/lib/mezzi/mezzi-attrezzature-batch";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneRow, MezzoRow } from "@/src/types/supabase-tables";
import type { SupabaseClient } from "@supabase/supabase-js";

function embedMezzo(raw: unknown): MezzoRow | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) return (raw[0] as MezzoRow) ?? null;
  return raw as MezzoRow;
}

/** Fetch singola lavorazione + embed mezzo telaio + batch attrezzature (SSOT read V2). */
export async function fetchEnrichedLavorazioneListRow(
  sb: SupabaseClient,
  lavorazioneId: string,
): Promise<LavorazioneListRow | null> {
  const id = lavorazioneId.trim();
  if (!id) return null;

  const { data, error } = await applyLavorazioniNotDeletedFilter(
    sb.from("lavorazioni").select(`${LAVORAZIONI_COLUMNS}, mezzi(${MEZZI_LIST_EMBED_COLUMNS})`).eq("id", id),
  ).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const raw = data as Record<string, unknown> & LavorazioneRow & { archived?: boolean };
  const mezzo = embedMezzo(raw.mezzi);
  const { mezzi: _m, ...rest } = raw;
  const row: LavorazioneListRow = {
    ...(rest as LavorazioneRow),
    archived: rest.archived === true,
    mezzo,
  };

  const enriched = await enrichLavorazioniListRowsWithAttrezzature(sb, [row]);
  return enriched[0] ?? null;
}
