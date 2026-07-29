import {
  isMezzoAssociationField,
  normalizeAssociationValue,
} from "@/lib/domain/mezzo/mezzo-association";
import { MEZZO_PERMANENT_FIELD_LABELS } from "@/lib/domain/mezzo/build-scheda-save-conflict-summary";
import {
  MEZZO_PERMANENT_FIELDS,
  type MezzoPermanentFieldKey,
} from "@/lib/schede/scheda-ingresso-field-roles";
import type { SchedaIngressoFields } from "@/types/schede";

export type MezzoAnagraficaChange = {
  field: MezzoPermanentFieldKey;
  label: string;
  oldValue: string;
  newValue: string;
};

function fieldStr(v: unknown): string {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function displayValue(v: string): string {
  return v.trim() || "—";
}

function fieldsEqual(
  key: MezzoPermanentFieldKey,
  original: Pick<SchedaIngressoFields, MezzoPermanentFieldKey>,
  current: Pick<SchedaIngressoFields, MezzoPermanentFieldKey>,
): boolean {
  const a = fieldStr(original[key]);
  const b = fieldStr(current[key]);
  if (isMezzoAssociationField(key)) {
    return normalizeAssociationValue(key, a) === normalizeAssociationValue(key, b);
  }
  return a === b;
}

export function detectMezzoAnagraficaChanges(
  original: Pick<SchedaIngressoFields, MezzoPermanentFieldKey>,
  current: Pick<SchedaIngressoFields, MezzoPermanentFieldKey>,
): { hasChanges: boolean; changes: MezzoAnagraficaChange[] } {
  const changes: MezzoAnagraficaChange[] = [];

  for (const key of MEZZO_PERMANENT_FIELDS) {
    if (fieldsEqual(key, original, current)) continue;
    const oldValue = displayValue(fieldStr(original[key]));
    const newValue = displayValue(fieldStr(current[key]));
    changes.push({
      field: key,
      label: MEZZO_PERMANENT_FIELD_LABELS[key],
      oldValue,
      newValue,
    });
  }

  return { hasChanges: changes.length > 0, changes };
}
