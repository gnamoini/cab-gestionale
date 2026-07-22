import { parseDecimalInput } from "@/lib/core/decimal-input";
import { trimOrNull } from "@/lib/domain/mezzo-attrezzatura/backfill-rules";
import type { MezzoUpdateFromSchedaPlan } from "@/lib/domain/mezzo/mezzo-update-from-scheda-plan";
import { buildMeteringPatchFromScheda } from "@/lib/domain/mezzo/evaluate-mezzo-metering-update";
import { normalizeVin } from "@/lib/mezzi/vin-normalize";
import type { MezzoPermanentFieldKey } from "@/lib/schede/scheda-ingresso-field-roles";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { MezzoUpdate } from "@/src/services/mezzi.service";
import type { SchedaIngressoFields } from "@/types/schede";

function patchFieldFromScheda(
  patch: MezzoUpdate,
  key: MezzoPermanentFieldKey,
  fields: SchedaIngressoFields,
): void {
  switch (key) {
    case "cliente":
      if (fields.cliente.trim()) patch.cliente = fields.cliente.trim();
      break;
    case "utilizzatore":
      patch.utilizzatore = fields.utilizzatore.trim() || null;
      break;
    case "cantiere":
      patch.meta = { ...(patch.meta ?? {}), cantiere: fields.cantiere.trim() };
      break;
    case "targa":
      patch.targa = fields.targa.trim() || null;
      break;
    case "nScuderia":
      patch.numero_scuderia = fields.nScuderia.trim() || null;
      break;
    case "tipoTelaio":
      patch.tipo_telaio = trimOrNull(fields.tipoTelaio);
      break;
    case "marcaTelaio":
      patch.marca_telaio = trimOrNull(fields.marcaTelaio);
      break;
    case "modelloTelaio":
      patch.modello_telaio = trimOrNull(fields.modelloTelaio);
      break;
    case "vin":
      patch.telaio_num = normalizeVin(fields.vin);
      break;
    default:
      break;
  }
}

export function buildMezzoAnagraficaPatchFromScheda(
  fields: SchedaIngressoFields,
  fieldsToUpdate: MezzoPermanentFieldKey[],
): MezzoUpdate {
  const patch: MezzoUpdate = {};
  for (const key of fieldsToUpdate) {
    patchFieldFromScheda(patch, key, fields);
  }
  return patch;
}

export function buildMezzoUpdatePatchFromSchedaPlan(
  fields: SchedaIngressoFields,
  mezzo: MezzoGestito | null | undefined,
  plan: MezzoUpdateFromSchedaPlan,
  lavorazioneId?: string | null,
): MezzoUpdate {
  let patch: MezzoUpdate = {};
  if (plan.updateAnagrafica && plan.fieldsToUpdate.length > 0) {
    patch = { ...patch, ...buildMezzoAnagraficaPatchFromScheda(fields, plan.fieldsToUpdate) };
  }
  if (plan.updateMetering && plan.meteringFields.length > 0) {
    patch = {
      ...patch,
      ...buildMeteringPatchFromScheda(fields, mezzo, plan.meteringFields, lavorazioneId),
    };
  }
  return patch;
}

export function schedaFieldsToAttrezzaturaPatch(
  fields: SchedaIngressoFields,
  keys: MezzoPermanentFieldKey[],
): {
  marca?: string;
  modello?: string;
  tipo_attrezzatura?: string | null;
  matricola?: string | null;
} {
  const patch: ReturnType<typeof schedaFieldsToAttrezzaturaPatch> = {};
  if (keys.includes("marcaAttrezzatura") && fields.marcaAttrezzatura.trim()) {
    patch.marca = fields.marcaAttrezzatura.trim();
  }
  if (keys.includes("modelloAttrezzatura") && fields.modelloAttrezzatura.trim()) {
    patch.modello = fields.modelloAttrezzatura.trim();
  }
  if (keys.includes("tipoAttrezzatura")) {
    patch.tipo_attrezzatura = trimOrNull(fields.tipoAttrezzatura);
  }
  if (keys.includes("matricola")) {
    patch.matricola = trimOrNull(fields.matricola);
  }
  return patch;
}

export function parseKmForMezzoCache(kmText: string): number | null {
  return parseDecimalInput(kmText?.trim() ?? "");
}
