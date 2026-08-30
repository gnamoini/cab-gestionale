import { attrezzaturaRowToGestita, type AttrezzaturaGestita } from "@/lib/attrezzature/types";
import { parseMezzoMeta } from "@/lib/mezzi/mezzi-meta";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { AttrezzaturaRow, MezzoRow } from "@/src/types/supabase-tables";

function str(v: string | null | undefined, fallback = "—"): string {
  const t = v?.trim();
  return t && t.length > 0 ? t : fallback;
}

/** Compone `MezzoGestito` da mezzo (telaio) + attrezzatura primaria opzionale. */
export function composeMezzoGestitoFromRows(
  mezzo: MezzoRow,
  primaryAttrezzatura?: AttrezzaturaRow | null,
): MezzoGestito {
  const meta = parseMezzoMeta(mezzo.meta);
  const att = primaryAttrezzatura ? attrezzaturaRowToGestita(primaryAttrezzatura) : null;

  const marcaTelaio = str(mezzo.marca_telaio, "") || meta.marcaTelaio;
  const modelloTelaio = str(mezzo.modello_telaio, "") || meta.modelloTelaio;
  const tipoTelaio = str(mezzo.tipo_telaio, "") || meta.tipoTelaio;
  const km = mezzo.km != null ? Number(mezzo.km) : meta.km;

  return {
    id: mezzo.id,
    cliente: str(mezzo.cliente, "—"),
    utilizzatore: str(mezzo.utilizzatore, "—"),
    marca: att?.marca ?? "—",
    modello: att?.modello ?? "—",
    targa: str(mezzo.targa, "—"),
    matricola: att ? att.matricola : "Non assegnata",
    numeroScuderia: mezzo.numero_scuderia?.trim() || undefined,
    tipoAttrezzatura: att?.tipoAttrezzatura ?? "—",
    cantiere: meta.cantiere,
    tagliandi: meta.tagliandi === true ? true : undefined,
    tipoTelaio: tipoTelaio || undefined,
    marcaTelaio: marcaTelaio || undefined,
    modelloTelaio: modelloTelaio || undefined,
    vin: mezzo.telaio_num?.trim() || undefined,
    anno: att?.anno ?? mezzo.anno ?? new Date().getFullYear(),
    oreKm: meta.oreLavoro ?? 0,
    km,
    statoAttuale: "Operativo",
    dataUltimaUscita: mezzo.updated_at?.slice(0, 10) || "—",
    note: mezzo.note?.trim() || "",
    priorita: "normale",
    hubSynthetic: false,
    ultimaModifica: mezzo.updated_at?.trim() || mezzo.created_at?.trim() || undefined,
    ultimoKmRilevato: mezzo.ultimo_km_rilevato ?? null,
    ultimoKmData: mezzo.ultimo_km_data ?? null,
    ultimoOreRilevate: mezzo.ultimo_ore_rilevate ?? null,
    ultimoOreData: mezzo.ultimo_ore_data ?? null,
    ultimoAggiornamentoDaLavorazioneId: mezzo.ultimo_aggiornamento_da_lavorazione_id ?? null,
  };
}

/** Prima attrezzatura per mezzo (ordine created_at). Liste mezzi senza target lavorazione. */
export function pickPrimaryAttrezzatura(
  rows: readonly AttrezzaturaRow[],
  mezzoId: string,
): AttrezzaturaRow | null {
  const list = rows.filter((a) => a.mezzo_id === mezzoId);
  if (list.length === 0) return null;
  return [...list].sort((a, b) => a.created_at.localeCompare(b.created_at))[0] ?? null;
}

/**
 * SSOT scelta attrezzatura:
 * 1. `preferredAttrezzaturaId` se appartiene al mezzo (contesto lavorazione)
 * 2. altrimenti primary per `created_at` (liste mezzo/report)
 * 3. null → UI "—" (no fallback colonne legacy mezzi)
 */
export function pickAttrezzaturaForContext(
  rows: readonly AttrezzaturaRow[],
  mezzoId: string,
  preferredAttrezzaturaId?: string | null,
): AttrezzaturaRow | null {
  const mid = mezzoId.trim();
  if (!mid) return null;
  const preferred = preferredAttrezzaturaId?.trim();
  if (preferred) {
    const hit = rows.find((a) => a.id === preferred && a.mezzo_id?.trim() === mid);
    if (hit) return hit;
  }
  return pickPrimaryAttrezzatura(rows, mid);
}

/** AttrezzaturaRow minima da embed mezzo già arricchito (post batch join). */
export function attrezzaturaRowFromEnrichedMezzo(
  mezzo: MezzoRow,
  attrezzaturaId: string,
  mezzoId: string,
): AttrezzaturaRow | null {
  const id = attrezzaturaId.trim();
  const mid = mezzoId.trim();
  if (!id || !mid) return null;
  const marca = mezzo.marca?.trim();
  if (!marca || marca === "—") return null;
  return {
    id,
    mezzo_id: mid,
    marca,
    modello: mezzo.modello?.trim() || "—",
    matricola: mezzo.matricola?.trim() || null,
    tipo_attrezzatura: mezzo.tipo_attrezzatura?.trim() || null,
    portata: null,
    anno: mezzo.anno,
    note: null,
    created_at: mezzo.created_at ?? "",
    updated_at: mezzo.updated_at ?? "",
    created_by: null,
  };
}

export function attrezzatureForMezzo(
  rows: readonly AttrezzaturaRow[],
  mezzoId: string,
): AttrezzaturaGestita[] {
  return rows
    .filter((a) => a.mezzo_id === mezzoId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map(attrezzaturaRowToGestita);
}

export type MezzoGestitoFromRowOpts = {
  attrezzatura?: AttrezzaturaRow | null;
  attrezzaturaId?: string | null;
  attrezzature?: readonly AttrezzaturaRow[];
};

/** Unico adapter DB / embed arricchito → MezzoGestito (SSOT read V2). */
export function mezzoGestitoFromRow(row: MezzoRow, opts?: MezzoGestitoFromRowOpts): MezzoGestito {
  const mid = row.id?.trim() ?? "";
  let att = opts?.attrezzatura ?? null;
  if (!att && opts?.attrezzature?.length && mid) {
    att = pickAttrezzaturaForContext(opts.attrezzature, mid, opts.attrezzaturaId);
  }
  if (!att && opts?.attrezzaturaId?.trim() && mid) {
    att = attrezzaturaRowFromEnrichedMezzo(row, opts.attrezzaturaId, mid);
  }
  return composeMezzoGestitoFromRows(row, att);
}
