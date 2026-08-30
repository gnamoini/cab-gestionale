import { buildSchedaIngressoFieldsFromMezzo } from "@/lib/schede/scheda-ingresso-mezzo-autofill";
import {
  isLavorazioneOnlyField,
  MEZZO_PERMANENT_FIELDS,
  type MezzoPermanentFieldKey,
} from "@/lib/schede/scheda-ingresso-field-roles";
import { captureFieldValuesEquivalent } from "@/lib/document-capture/capture-ingresso-field-hints";
import { isStrongIdentityField } from "@/lib/document-capture/capture-mezzo-match-state";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoFields } from "@/types/schede";

export type CaptureIngressoMergeResult = {
  fields: SchedaIngressoFields;
  missingFromRegistry: Array<{
    field: MezzoPermanentFieldKey;
    scannedValue: string;
  }>;
  conflicts: Array<{
    field: MezzoPermanentFieldKey;
    registryValue: string;
    scannedValue: string;
    severity: "strong_identity" | "soft";
  }>;
};

function fieldStr(v: unknown): string {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function fieldsEquivalent(key: MezzoPermanentFieldKey, a: string, b: string): boolean {
  if (!a && !b) return true;
  if (key === "cliente") {
    return captureFieldValuesEquivalent(a, b, { standardizeLegalSuffix: true });
  }
  return a === b;
}

/** Merge puro: base registro + overlay lavorazione-only da scan; rileva gap e conflitti senza decidere. */
export function mergeCaptureIngressoWithLinkedMezzo(input: {
  scannedFields: SchedaIngressoFields;
  linkedMezzo: MezzoGestito;
}): CaptureIngressoMergeResult {
  const fromRegistry = buildSchedaIngressoFieldsFromMezzo(input.linkedMezzo);
  const fields: SchedaIngressoFields = { ...fromRegistry };

  for (const key of Object.keys(input.scannedFields) as Array<keyof SchedaIngressoFields>) {
    if (isLavorazioneOnlyField(key)) {
      const scanVal = fieldStr(input.scannedFields[key]);
      if (scanVal) {
        (fields as Record<string, unknown>)[key] = scanVal;
      }
    }
  }

  if (fieldStr(input.scannedFields.dataIngresso)) {
    fields.dataIngresso = fieldStr(input.scannedFields.dataIngresso);
  }

  const missingFromRegistry: CaptureIngressoMergeResult["missingFromRegistry"] = [];
  const conflicts: CaptureIngressoMergeResult["conflicts"] = [];

  for (const key of MEZZO_PERMANENT_FIELDS) {
    const scanVal = fieldStr(input.scannedFields[key]);
    const regVal = fieldStr(fromRegistry[key]);
    if (!scanVal && !regVal) continue;

    if (scanVal && !regVal) {
      missingFromRegistry.push({ field: key, scannedValue: scanVal });
      continue;
    }

    if (!scanVal && regVal) continue;

    if (!fieldsEquivalent(key, scanVal, regVal)) {
      conflicts.push({
        field: key,
        registryValue: regVal,
        scannedValue: scanVal,
        severity: isStrongIdentityField(key) ? "strong_identity" : "soft",
      });
    }
  }

  return { fields, missingFromRegistry, conflicts };
}
