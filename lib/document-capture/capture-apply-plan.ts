import {
  buildCaptureSchedeBundle,
  mapCaptureFieldsToIngresso,
  type CaptureFieldRow,
} from "@/lib/document-capture/capture-field-mapper";
import {
  CapturePlanStaleError,
  hashConfirmedCaptureFields,
} from "@/lib/document-capture/capture-plan-staleness";
import { resolveFieldsForHash } from "@/lib/document-capture/resolve-fields-for-hash";

export type CaptureApplyPlan = {
  creates: {
    mezzo?: boolean;
    lavorazioniScheda?: boolean;
    ricambiScheda?: boolean;
  };
  updates: { ingressoFields: Record<string, string> };
  links: {
    lavorazioneId: string | null;
    mezzoId: string | null;
    attrezzaturaId: string | null;
  };
  magazzino: { movimentiPrevisti: unknown[]; approvedMagazzinoScarico: boolean };
  bundlePreview: ReturnType<typeof buildCaptureSchedeBundle> | null;
};

export type ApprovedCreatesJson = {
  mezzo?: boolean;
  lavorazioni?: boolean;
  ricambi?: boolean;
  magazzinoScarico?: boolean;
};

export function buildCaptureApplyPlanFromFields(input: {
  fields: readonly CaptureFieldRow[];
  lavorazioneId: string | null;
  mezzoId: string | null;
  attrezzaturaId: string | null;
  approvedCreates?: ApprovedCreatesJson;
  createdBy: string;
}): CaptureApplyPlan {
  const approved = input.approvedCreates ?? { mezzo: true, lavorazioni: true, ricambi: true };
  const ingressoFields = mapCaptureFieldsToIngresso(input.fields);
  const previewLavId = input.lavorazioneId ?? "00000000-0000-4000-8000-000000000099";

  return {
    creates: {
      mezzo: approved.mezzo !== false,
      lavorazioniScheda: approved.lavorazioni !== false,
      ricambiScheda: approved.ricambi !== false,
    },
    updates: {
      ingressoFields: ingressoFields as unknown as Record<string, string>,
    },
    links: {
      lavorazioneId: input.lavorazioneId,
      mezzoId: input.mezzoId,
      attrezzaturaId: input.attrezzaturaId,
    },
    magazzino: {
      movimentiPrevisti: [],
      approvedMagazzinoScarico: approved.magazzinoScarico === true,
    },
    bundlePreview: buildCaptureSchedeBundle({
      lavorazioneId: previewLavId,
      fields: input.fields,
      createdBy: input.createdBy,
      includeLavorazioni: approved.lavorazioni !== false,
      includeRicambi: approved.ricambi !== false,
    }),
  };
}

export function hashCaptureFieldsRows(fields: readonly CaptureFieldRow[]): string {
  return hashConfirmedCaptureFields(resolveFieldsForHash(fields));
}

export function assertCapturePlanFresh(input: {
  applicationCaptureVersion: number | null;
  applicationCaptureUpdatedAt: string | null;
  applicationSourceFieldsHash: string | null;
  captureCaptureVersion: number;
  captureUpdatedAt: string;
  currentFieldsHash: string;
}): void {
  if (
    input.applicationCaptureVersion !== input.captureCaptureVersion ||
    input.applicationCaptureUpdatedAt !== input.captureUpdatedAt ||
    input.applicationSourceFieldsHash !== input.currentFieldsHash
  ) {
    throw new CapturePlanStaleError();
  }
}
