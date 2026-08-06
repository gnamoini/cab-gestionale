import type { SchedaIngressoFields } from "@/types/schede";

/** Campi renderizzati da `SchedaIngressoAnagraficaFields`. */
export const SCHEDA_INGRESSO_ANAGRAFICA_FIELD_KEYS = [
  "targetType",
  "attrezzaturaId",
  "cliente",
  "cantiere",
  "utilizzatore",
  "richiedente",
  "richiedenteTelefono",
  "richiedenteFirma",
  "tipoAttrezzatura",
  "marcaAttrezzatura",
  "modelloAttrezzatura",
  "matricola",
  "nScuderia",
  "tipoTelaio",
  "marcaTelaio",
  "modelloTelaio",
  "targa",
  "vin",
  "oreLavoro",
  "km",
  "livelloCarburante",
] as const satisfies readonly (keyof SchedaIngressoFields)[];

export const SCHEDA_INGRESSO_INGRESSO_FIELD_KEYS = [
  "dataIngresso",
  "addettoAccettazione",
  "addettoFirma",
] as const satisfies readonly (keyof SchedaIngressoFields)[];

export const SCHEDA_INGRESSO_INTERVENTO_FIELD_KEYS = [
  "descrizioneAnomalia",
  "interventoSuAttrezzatura",
  "interventoSuTelaio",
] as const satisfies readonly (keyof SchedaIngressoFields)[];

export function schedaIngressoFieldsSliceEqual<K extends keyof SchedaIngressoFields>(
  a: SchedaIngressoFields,
  b: SchedaIngressoFields,
  keys: readonly K[],
): boolean {
  for (const key of keys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}
