import { detectMezzoAnagraficaChanges } from "@/lib/domain/mezzo/detect-mezzo-anagrafica-changes";
import { pickMezzoPermanentFields, type MezzoPermanentFieldKey } from "@/lib/schede/scheda-ingresso-field-roles";
import { buildSchedaIngressoFieldsFromMezzo } from "@/lib/schede/scheda-ingresso-mezzo-autofill";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoFields } from "@/types/schede";

export type MezzoCatalogFieldDrift = {
  field: MezzoPermanentFieldKey;
  savedValue: string;
};

/** Campi permanenti modificati dall'utente e diversi dall'anagrafica mezzo salvata. */
export function listMezzoCatalogFieldDrifts(
  fields: SchedaIngressoFields,
  mezzo: MezzoGestito,
  editedFields: readonly MezzoPermanentFieldKey[],
): MezzoCatalogFieldDrift[] {
  if (editedFields.length === 0) return [];
  const edited = new Set(editedFields);
  const saved = pickMezzoPermanentFields(buildSchedaIngressoFieldsFromMezzo(mezzo));
  const detected = detectMezzoAnagraficaChanges(saved, pickMezzoPermanentFields(fields));
  return detected.changes
    .filter((change) => edited.has(change.field))
    .map((change) => ({ field: change.field, savedValue: change.oldValue }));
}
