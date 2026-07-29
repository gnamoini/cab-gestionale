import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import type { CaptureIdent } from "@/lib/document-capture/capture-lavorazione-match";
import {
  resolveCaptureLavorazioneMatch,
  type CaptureLavorazioneMatchResolution,
} from "@/lib/document-capture/resolve-capture-lavorazione-match";
import {
  resolveCaptureMezzoMatch,
  type CaptureMezzoMatchResolution,
} from "@/lib/document-capture/resolve-capture-mezzo-match";
import { isCaptureMezzoMatchAutoSuggest } from "@/lib/document-capture/capture-mezzo-catalog-match";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { LavorazioneSchedeStore } from "@/types/schede";

export type CaptureIngressoContextPriority =
  | "lavorazione_existing"
  | "mezzo_catalog"
  | "new_entry";

export type CaptureIngressoContextResolution = {
  ident: CaptureIdent;
  lavorazione: CaptureLavorazioneMatchResolution;
  mezzo: CaptureMezzoMatchResolution;
  priority: CaptureIngressoContextPriority;
  contextHint: string | null;
};

export function decideContextPriority(input: {
  lavorazione: CaptureLavorazioneMatchResolution;
  mezzo: CaptureMezzoMatchResolution;
}): { priority: CaptureIngressoContextPriority; hint: string | null } {
  const lavBest = input.lavorazione.recommendedMatch;
  const mezzoBest = input.mezzo.recommendedMatch;

  if (
    lavBest &&
    mezzoBest &&
    isCaptureMezzoMatchAutoSuggest(mezzoBest.matchStrength) &&
    lavBest.score >= mezzoBest.score
  ) {
    return {
      priority: "lavorazione_existing",
      hint: "Lavorazione aperta trovata con identificativi compatibili.",
    };
  }

  if (mezzoBest && isCaptureMezzoMatchAutoSuggest(mezzoBest.matchStrength)) {
    return {
      priority: "mezzo_catalog",
      hint: null,
    };
  }

  if (input.mezzo.candidates.length > 0) {
    return {
      priority: "mezzo_catalog",
      hint: "Più mezzi possibili — seleziona quello corretto o crea un nuovo mezzo.",
    };
  }

  return {
    priority: "new_entry",
    hint: "Nessun mezzo corrispondente con sufficiente confidenza.",
  };
}

export function resolveCaptureIngressoContext(input: {
  captureFields: readonly CaptureFieldRow[];
  mezziCatalog: readonly MezzoGestito[];
  attive: readonly LavorazioneAttiva[];
  schedeStore: LavorazioneSchedeStore;
}): CaptureIngressoContextResolution {
  const lavorazione = resolveCaptureLavorazioneMatch(input);
  const mezzo = resolveCaptureMezzoMatch({
    captureFields: input.captureFields,
    mezziCatalog: input.mezziCatalog,
  });
  const { priority, hint } = decideContextPriority({ lavorazione, mezzo });

  return {
    ident: mezzo.ident,
    lavorazione,
    mezzo,
    priority,
    contextHint: hint,
  };
}
