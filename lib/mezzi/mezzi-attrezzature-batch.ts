import { ATTREZZATURE_COLUMNS, MEZZI_LIST_LIGHT_COLUMNS } from "@/lib/db/table-select-columns";
import {
  composeMezzoGestitoFromRows,
  mezzoGestitoFromRow,
  pickAttrezzaturaForContext,
} from "@/lib/domain/mezzo-attrezzatura/compose-mezzo-gestito";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { AttrezzaturaRow, MezzoRow } from "@/src/types/supabase-tables";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { SupabaseClient } from "@supabase/supabase-js";
export async function fetchAttrezzatureForMezzoIds(
  sb: SupabaseClient,
  mezzoIds: readonly string[],
): Promise<AttrezzaturaRow[]> {
  const ids = [...new Set(mezzoIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return [];
  const { data, error } = await sb.from("attrezzature").select(ATTREZZATURE_COLUMNS).in("mezzo_id", ids);
  if (error) throw new Error(error.message);
  return (data ?? []) as AttrezzaturaRow[];
}

export function indexAttrezzatureByMezzoId(
  rows: readonly AttrezzaturaRow[],
): Map<string, AttrezzaturaRow[]> {
  const map = new Map<string, AttrezzaturaRow[]>();
  for (const row of rows) {
    const mid = row.mezzo_id?.trim();
    if (!mid) continue;
    const list = map.get(mid);
    if (list) list.push(row);
    else map.set(mid, [row]);
  }
  return map;
}

/** Compone MezzoGestito[] con attrezzatura primaria joinata (SSOT read V2). */
export function mapMezziRowsWithAttrezzature(
  mezzoRows: readonly MezzoRow[],
  attrezzaturaRows: readonly AttrezzaturaRow[],
): MezzoGestito[] {
  return mezzoRows.map((row) => {
    const primary = pickAttrezzaturaForContext(attrezzaturaRows, row.id);
    return mezzoGestitoFromRow(row, { attrezzatura: primary });
  });
}

/** Arricchisce embed mezzo su lavorazioni list con attrezzatura joinata (V2 SSOT). */
export async function enrichLavorazioniListRowsWithAttrezzature(
  sb: SupabaseClient,
  rows: readonly LavorazioneListRow[],
): Promise<LavorazioneListRow[]> {
  const mezzoIds = [...new Set(rows.map((r) => r.mezzo_id?.trim()).filter(Boolean))] as string[];
  if (mezzoIds.length === 0) return [...rows];
  const attRows = await fetchAttrezzatureForMezzoIds(sb, mezzoIds);
  return rows.map((row) => {
    if (!row.mezzo) return row;
    const mid = row.mezzo_id?.trim() ?? row.mezzo.id;
    const att = pickAttrezzaturaForContext(attRows, mid, row.attrezzatura_id);
    const gestito = composeMezzoGestitoFromRows(row.mezzo, att);
    return { ...row, mezzo: mezzoGestitoToEmbedRow(gestito) };
  });
}

/** Singolo mezzo + attrezzature del mezzo → MezzoGestito. */
export async function fetchMezzoGestitoById(
  sb: SupabaseClient,
  mezzoId: string,
  mezzoRow?: MezzoRow | null,
): Promise<MezzoGestito | null> {
  const id = mezzoId.trim();
  if (!id) return null;
  let row = mezzoRow ?? null;
  if (!row) {
    const { data, error } = await sb.from("mezzi").select(MEZZI_LIST_LIGHT_COLUMNS).eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    row = data as MezzoRow;
  }
  const attRows = await fetchAttrezzatureForMezzoIds(sb, [id]);
  return mapMezziRowsWithAttrezzature([row], attRows)[0] ?? null;
}

/** MezzoGestito → MezzoRow embed (report / join lavorazioni). */
export function mezzoGestitoToEmbedRow(g: MezzoGestito): MezzoRow {
  const matricolaRaw = g.matricola?.trim();
  return {
    id: g.id,
    cliente: g.cliente,
    utilizzatore: g.utilizzatore,
    marca: g.marca,
    modello: g.modello,
    targa: g.targa,
    matricola: matricolaRaw && matricolaRaw !== "Non assegnata" ? matricolaRaw : null,
    numero_scuderia: g.numeroScuderia ?? null,
    tipo_attrezzatura: g.tipoAttrezzatura,
    anno: g.anno,
    meta: null,
    entity_key: null,
    marca_telaio: g.marcaTelaio ?? null,
    modello_telaio: g.modelloTelaio ?? null,
    tipo_telaio: g.tipoTelaio ?? null,
    telaio_num: null,
    km: g.km ?? null,
    note: g.note ?? null,
    created_at: g.ultimaModifica ?? "",
    updated_at: g.ultimaModifica ?? "",
  };
}

export function mezziGestitiToEmbedMap(gestiti: readonly MezzoGestito[]): Map<string, MezzoRow> {
  const map = new Map<string, MezzoRow>();
  for (const g of gestiti) {
    if (g.id) map.set(g.id, mezzoGestitoToEmbedRow(g));
  }
  return map;
}
