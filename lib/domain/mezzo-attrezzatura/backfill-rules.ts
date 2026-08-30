/**
 * Regole backfill legacy mezzi → mezzo (telaio) + attrezzature (1:1).
 * SSOT per migration SQL e test caratterizzazione.
 */

import { parseMezzoMeta, type MezzoAnagraficaMeta } from "@/lib/mezzi/mezzi-meta";
import type { MezzoRow } from "@/src/types/supabase-tables";

export type LegacyMezzoBackfillInput = {
  id: string;
  marca: string;
  modello?: string | null;
  matricola?: string | null;
  tipo_attrezzatura?: string | null;
  anno?: number | null;
  targa?: string | null;
  meta?: MezzoRow["meta"];
};

export type AttrezzaturaBackfillRow = {
  mezzo_id: string;
  marca: string;
  modello: string;
  tipo_attrezzatura: string | null;
  matricola: string | null;
  anno: number | null;
};

export type MezzoTelaioBackfillPatch = {
  marca_telaio: string | null;
  modello_telaio: string | null;
  tipo_telaio: string | null;
  telaio_num: string | null;
  km: number | null;
};

export function trimOrNull(v: string | null | undefined): string | null {
  const t = v?.trim();
  return t && t.length > 0 && t !== "—" ? t : null;
}

/** Una riga attrezzatura per ogni mezzo legacy (1:1). */
export function mapLegacyMezzoToAttrezzatura(row: LegacyMezzoBackfillInput): AttrezzaturaBackfillRow {
  return {
    mezzo_id: row.id,
    marca: row.marca.trim(),
    modello: trimOrNull(row.modello) ?? "—",
    tipo_attrezzatura: trimOrNull(row.tipo_attrezzatura),
    matricola: trimOrNull(row.matricola),
    anno: row.anno ?? null,
  };
}

export function mapMetaToMezzoTelaioPatch(
  meta: MezzoAnagraficaMeta,
  _targa: string | null,
): MezzoTelaioBackfillPatch {
  void _targa;
  return {
    marca_telaio: trimOrNull(meta.marcaTelaio),
    modello_telaio: trimOrNull(meta.modelloTelaio),
    tipo_telaio: trimOrNull(meta.tipoTelaio),
    telaio_num: null,
    km: meta.km != null && meta.km >= 0 ? meta.km : null,
  };
}

export function buildMezzoTelaioBackfillFromRow(row: LegacyMezzoBackfillInput): MezzoTelaioBackfillPatch {
  const meta = parseMezzoMeta(row.meta);
  return mapMetaToMezzoTelaioPatch(meta, row.targa ?? null);
}

/** Lavorazione legacy → target attrezzatura collegata al mezzo. */
export function defaultLavorazioneTarget(attrezzaturaId: string) {
  return {
    target_type: "attrezzatura" as const,
    attrezzatura_id: attrezzaturaId,
  };
}
