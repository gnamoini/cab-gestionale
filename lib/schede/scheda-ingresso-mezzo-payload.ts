import { mezzoFormToMeta } from "@/lib/mezzi/mezzi-meta";
import type { MezzoInsert, MezzoUpdate } from "@/src/services/mezzi.service";
import type { SchedaIngressoFields } from "@/types/schede";

/**
 * Solo dati anagrafici persistenti del mezzo (colonne `mezzi` + meta).
 * Esclude campi runtime della lavorazione/scheda: anomalia, note intervento, addetto, carburante, data ingresso, richiedente.
 */
export function schedaIngressoFieldsToMezzoPayload(
  fields: SchedaIngressoFields,
  options?: { anno?: number },
): MezzoInsert {
  const annoRaw = options?.anno ?? new Date().getFullYear();
  const anno = Math.max(1980, Math.min(2035, Number.isFinite(annoRaw) ? annoRaw : new Date().getFullYear()));
  return {
    cliente: fields.cliente.trim(),
    utilizzatore: fields.utilizzatore.trim() || null,
    marca: fields.marcaAttrezzatura.trim(),
    modello: fields.modelloAttrezzatura.trim() || "—",
    targa: fields.targa.trim() || null,
    matricola: fields.matricola.trim() || null,
    numero_scuderia: fields.nScuderia.trim() || null,
    tipo_attrezzatura: fields.tipoAttrezzatura.trim() || null,
    anno,
    meta: mezzoFormToMeta({
      cantiere: fields.cantiere,
      tipoTelaio: fields.tipoTelaio,
      marcaTelaio: fields.marcaTelaio,
      modelloTelaio: fields.modelloTelaio,
      oreLavoro: fields.oreLavoro,
      km: fields.km,
    }) as Record<string, unknown>,
  };
}

export function schedaIngressoFieldsToMezzoUpdate(
  fields: SchedaIngressoFields,
  options?: { anno?: number },
): MezzoUpdate {
  return schedaIngressoFieldsToMezzoPayload(fields, options);
}
