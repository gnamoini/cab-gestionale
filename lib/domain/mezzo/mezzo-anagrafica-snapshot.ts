import { parseMezzoMeta } from "@/lib/mezzi/mezzi-meta";
import type { MezzoPermanentFieldKey } from "@/lib/schede/scheda-ingresso-field-roles";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { AttrezzaturaRow, MezzoRow } from "@/src/types/supabase-tables";
import type { SchedaIngressoFields } from "@/types/schede";
import { pickMezzoPermanentFields } from "@/lib/schede/scheda-ingresso-field-roles";

function s(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

/** Snapshot stringhe per diff history da riga DB. */
export function mezzoRowToAnagraficaSnapshot(
  row: MezzoRow,
  att?: AttrezzaturaRow | null,
): Record<MezzoPermanentFieldKey, string> {
  const meta = parseMezzoMeta(row.meta);
  return {
    targetType: "attrezzatura",
    attrezzaturaId: att?.id ?? "",
    cliente: s(row.cliente),
    cantiere: s(meta.cantiere),
    utilizzatore: s(row.utilizzatore),
    richiedente: "",
    richiedenteTelefono: "",
    tipoAttrezzatura: s(att?.tipo_attrezzatura ?? row.tipo_attrezzatura),
    marcaAttrezzatura: s(att?.marca ?? row.marca),
    modelloAttrezzatura: s(att?.modello ?? row.modello),
    matricola: s(att?.matricola ?? row.matricola),
    nScuderia: s(row.numero_scuderia),
    tipoTelaio: s(row.tipo_telaio ?? meta.tipoTelaio),
    marcaTelaio: s(row.marca_telaio ?? meta.marcaTelaio),
    modelloTelaio: s(row.modello_telaio ?? meta.modelloTelaio),
    vin: s(row.telaio_num),
    targa: s(row.targa),
  };
}

export function schedaFieldsToAnagraficaSnapshot(
  fields: SchedaIngressoFields,
): Record<MezzoPermanentFieldKey, string> {
  const picked = pickMezzoPermanentFields(fields);
  const out = {} as Record<MezzoPermanentFieldKey, string>;
  for (const [k, v] of Object.entries(picked) as [MezzoPermanentFieldKey, string][]) {
    out[k] = s(v);
  }
  return out;
}

export function mezzoGestitoToAnagraficaSnapshot(mezzo: MezzoGestito): Record<MezzoPermanentFieldKey, string> {
  return {
    targetType: "attrezzatura",
    attrezzaturaId: "",
    cliente: s(mezzo.cliente),
    cantiere: s(mezzo.cantiere),
    utilizzatore: s(mezzo.utilizzatore),
    richiedente: "",
    richiedenteTelefono: "",
    tipoAttrezzatura: s(mezzo.tipoAttrezzatura),
    marcaAttrezzatura: s(mezzo.marca),
    modelloAttrezzatura: s(mezzo.modello),
    matricola: s(mezzo.matricola),
    nScuderia: s(mezzo.numeroScuderia),
    tipoTelaio: s(mezzo.tipoTelaio),
    marcaTelaio: s(mezzo.marcaTelaio),
    modelloTelaio: s(mezzo.modelloTelaio),
    vin: s(mezzo.vin),
    targa: s(mezzo.targa),
  };
}
