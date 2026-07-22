import {
  approvedCreatesFromCaptureFields,
  normalizeApprovedCreates,
  type ApprovedCreatesJson,
  type CaptureApprovedCreates,
} from "@/lib/document-capture/capture-approved-creates";
import {
  buildCaptureSchedeBundle,
  inferCaptureSchedaTipo,
  mapCaptureFieldsToIngresso,
  type CaptureFieldRow,
} from "@/lib/document-capture/capture-field-mapper";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import {
  CapturePlanStaleError,
  hashConfirmedCaptureFields,
} from "@/lib/document-capture/capture-plan-staleness";
import { resolveFieldsForHash } from "@/lib/document-capture/resolve-fields-for-hash";

export type { ApprovedCreatesJson, CaptureApprovedCreates };

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

export function buildCaptureApplyPlanFromFields(input: {
  fields: readonly CaptureFieldRow[];
  lavorazioneId: string | null;
  mezzoId: string | null;
  attrezzaturaId: string | null;
  approvedCreates?: ApprovedCreatesJson;
  createdBy: string;
  magazzino?: readonly RicambioMagazzino[];
}): CaptureApplyPlan {
  const approved = input.approvedCreates
    ? normalizeApprovedCreates(input.approvedCreates)
    : approvedCreatesFromCaptureFields(input.fields);
  const schedaTipo = inferCaptureSchedaTipo(input.fields);
  const ingressoFields = mapCaptureFieldsToIngresso(input.fields);
  const previewLavId = input.lavorazioneId ?? "00000000-0000-4000-8000-000000000099";
  const includeIngresso = schedaTipo === "ingresso" || schedaTipo === null || !input.lavorazioneId;

  return {
    creates: {
      mezzo: approved.mezzo,
      lavorazioniScheda: approved.lavorazioni,
      ricambiScheda: approved.ricambi,
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
      approvedMagazzinoScarico: input.approvedCreates?.magazzinoScarico === true,
    },
    bundlePreview: (() => {
      const bundle = buildCaptureSchedeBundle({
        lavorazioneId: previewLavId,
        fields: input.fields,
        createdBy: input.createdBy,
        includeLavorazioni: approved.lavorazioni,
        includeRicambi: approved.ricambi,
        schedaTipo,
        magazzino: input.magazzino,
      });
      if (!includeIngresso) bundle.ingresso = null;
      return bundle;
    })(),
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
