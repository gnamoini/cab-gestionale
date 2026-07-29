import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import {
  type CaptureIdent,
  type CaptureMatchCandidate,
  hasCaptureIdentLookup,
  resolveCaptureIdentFromFields,
  scoreCaptureLavorazioneCandidates,
} from "@/lib/document-capture/capture-lavorazione-match";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { LavorazioneSchedeStore } from "@/types/schede";

export type CaptureLavorazioneMatchResolution = {
  ident: CaptureIdent;
  candidates: CaptureMatchCandidate[];
  recommendedMatch: CaptureMatchCandidate | null;
  hasOpenLavorazione: boolean;
};

export function resolveCaptureLavorazioneMatch(input: {
  captureFields: readonly CaptureFieldRow[];
  mezziCatalog: readonly MezzoGestito[];
  attive: readonly LavorazioneAttiva[];
  schedeStore: LavorazioneSchedeStore;
}): CaptureLavorazioneMatchResolution {
  const ident = resolveCaptureIdentFromFields(input.captureFields);
  const candidates = hasCaptureIdentLookup(ident)
    ? scoreCaptureLavorazioneCandidates(
        ident,
        input.mezziCatalog,
        input.schedeStore,
        input.attive,
      )
    : [];

  return {
    ident,
    candidates,
    recommendedMatch: candidates[0] ?? null,
    hasOpenLavorazione: candidates.length > 0,
  };
}
