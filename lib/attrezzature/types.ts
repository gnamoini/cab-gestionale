import type { InterventoTargetType } from "@/lib/domain/mezzo-attrezzatura/intervento-target";
import type { AttrezzaturaRow } from "@/src/types/supabase-tables";

export type AttrezzaturaGestita = {
  id: string;
  mezzoId: string;
  marca: string;
  modello: string;
  tipoAttrezzatura: string;
  matricola: string;
  portata: string;
  anno: number | null;
  note: string;
};

export function attrezzaturaRowToGestita(row: AttrezzaturaRow): AttrezzaturaGestita {
  return {
    id: row.id,
    mezzoId: row.mezzo_id,
    marca: row.marca,
    modello: row.modello?.trim() || "—",
    tipoAttrezzatura: row.tipo_attrezzatura?.trim() || "—",
    matricola: row.matricola?.trim() || "Non assegnata",
    portata: row.portata?.trim() || "",
    anno: row.anno,
    note: row.note?.trim() || "",
  };
}

export type UpsertFromSchedaV2Result = {
  mezzoId: string;
  attrezzaturaId: string | null;
  targetType: InterventoTargetType;
  createdMezzo: boolean;
  createdAttrezzatura: boolean;
};
