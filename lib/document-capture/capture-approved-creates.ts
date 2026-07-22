import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import { detectCaptureSchedaTipos } from "@/lib/document-capture/capture-multi-scheda";

export interface CaptureApprovedCreates {
  mezzo: boolean;
  lavorazioni: boolean;
  ricambi: boolean;
}

/** JSON parziale persistito in DB (può includere magazzinoScarico). */
export type ApprovedCreatesJson = Partial<CaptureApprovedCreates> & {
  magazzinoScarico?: boolean;
};

/** Normalizza alla lettura: solo === true crea, undefined/false → false. */
export function normalizeApprovedCreates(value?: ApprovedCreatesJson | null): CaptureApprovedCreates {
  return {
    mezzo: value?.mezzo === true,
    lavorazioni: value?.lavorazioni === true,
    ricambi: value?.ricambi === true,
  };
}

/** Deriva da campi estratti (SSOT rilevamento schede). */
export function approvedCreatesFromCaptureFields(fields: readonly CaptureFieldRow[]): CaptureApprovedCreates {
  const tipos = detectCaptureSchedaTipos(fields);
  return {
    mezzo: true,
    lavorazioni: tipos.includes("lavorazioni"),
    ricambi: tipos.includes("ricambi"),
  };
}

/** Apply: usa JSON persistito se presente, altrimenti rigenera da fields. */
export function resolveApprovedCreatesForApply(
  raw: ApprovedCreatesJson | null | undefined,
  fields: readonly CaptureFieldRow[],
): CaptureApprovedCreates {
  if (raw != null) return normalizeApprovedCreates(raw);
  return approvedCreatesFromCaptureFields(fields);
}
