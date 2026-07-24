import type { SchedaIngressoFields } from "@/types/schede";

/** Campi anagrafici permanenti del mezzo (copiabili da mezzo, non da scheda come SSOT). */
export const MEZZO_PERMANENT_FIELDS = [
  "targetType",
  "attrezzaturaId",
  "cliente",
  "cantiere",
  "utilizzatore",
  "richiedente",
  "richiedenteTelefono",
  "tipoAttrezzatura",
  "marcaAttrezzatura",
  "modelloAttrezzatura",
  "matricola",
  "nScuderia",
  "tipoTelaio",
  "marcaTelaio",
  "modelloTelaio",
  "vin",
  "targa",
] as const satisfies readonly (keyof SchedaIngressoFields)[];

export type MezzoPermanentFieldKey = (typeof MEZZO_PERMANENT_FIELDS)[number];

/** Campi legati alla singola lavorazione — mai copiati da mezzo né salvati in anagrafica mezzo. */
export const LAVORAZIONE_ONLY_FIELDS = [
  "descrizioneAnomalia",
  "km",
  "oreLavoro",
  "livelloCarburante",
  "dataIngresso",
  "addettoAccettazione",
] as const satisfies readonly (keyof SchedaIngressoFields)[];

export type LavorazioneOnlyFieldKey = (typeof LAVORAZIONE_ONLY_FIELDS)[number];

/** Metering: snapshot in scheda; cache condizionale su mezzo. */
export const MEZZO_METERING_FIELDS = ["km", "oreLavoro"] as const satisfies readonly (keyof SchedaIngressoFields)[];

export type MezzoMeteringFieldKey = (typeof MEZZO_METERING_FIELDS)[number];

const LAVORAZIONE_ONLY_SET = new Set<keyof SchedaIngressoFields>(LAVORAZIONE_ONLY_FIELDS);

export function isLavorazioneOnlyField(key: keyof SchedaIngressoFields): boolean {
  return LAVORAZIONE_ONLY_SET.has(key);
}

export function isMezzoPermanentField(key: keyof SchedaIngressoFields): key is MezzoPermanentFieldKey {
  return (MEZZO_PERMANENT_FIELDS as readonly (keyof SchedaIngressoFields)[]).includes(key);
}

export function pickMezzoPermanentFields(
  fields: SchedaIngressoFields,
): Pick<SchedaIngressoFields, MezzoPermanentFieldKey> {
  const out = {} as Pick<SchedaIngressoFields, MezzoPermanentFieldKey>;
  for (const key of MEZZO_PERMANENT_FIELDS) {
    (out as Record<MezzoPermanentFieldKey, SchedaIngressoFields[MezzoPermanentFieldKey]>)[key] =
      fields[key] as SchedaIngressoFields[MezzoPermanentFieldKey];
  }
  return out;
}
