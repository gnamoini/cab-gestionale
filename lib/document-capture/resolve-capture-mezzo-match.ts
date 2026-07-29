import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import {
  type CaptureIdent,
  hasCaptureIdentLookup,
  resolveCaptureIdentFromFields,
} from "@/lib/document-capture/capture-lavorazione-match";
import {
  hashCaptureMezzoMatchReasons,
  isCaptureMezzoMatchAutoSuggest,
  scoreCaptureMezzoCandidates,
  type CaptureMezzoMatchCandidate,
  type MatchStrength,
} from "@/lib/document-capture/capture-mezzo-catalog-match";
import type { MezzoGestito } from "@/lib/mezzi/types";

export type CaptureMezzoMatchDecision = "auto_suggest" | "choose" | "no_match";

export type CaptureMezzoMatchResolution = {
  ident: CaptureIdent;
  candidates: CaptureMezzoMatchCandidate[];
  recommendedMatch: CaptureMezzoMatchCandidate | null;
  matchStrength: MatchStrength;
  confidence: number;
  decision: CaptureMezzoMatchDecision;
  reasonsSummary: string[];
  reasonsHash: string;
};

function buildReasonsSummary(candidate: CaptureMezzoMatchCandidate | null): string[] {
  if (!candidate) return [];
  return candidate.reasons
    .filter((r) => r.type === "exact" || r.type === "normalized")
    .map((r) => {
      if (r.field === "targa") return `Targa ${r.scannedValue || r.catalogValue} trovata`;
      if (r.field === "matricola") return `Matricola ${r.scannedValue || r.catalogValue} trovata`;
      if (r.field === "vin") return `VIN ${r.scannedValue || r.catalogValue} trovato`;
      if (r.field === "nScuderia") return `N. scuderia ${r.scannedValue || r.catalogValue} trovato`;
      if (r.field === "cliente") return "Cliente coincidente";
      return `${r.field} coincidente`;
    });
}

export function resolveCaptureMezzoMatch(input: {
  captureFields: readonly CaptureFieldRow[];
  mezziCatalog: readonly MezzoGestito[];
}): CaptureMezzoMatchResolution {
  const ident = resolveCaptureIdentFromFields(input.captureFields);
  const candidates = hasCaptureIdentLookup(ident)
    ? scoreCaptureMezzoCandidates(ident, input.mezziCatalog)
    : [];

  const recommendedMatch = candidates[0] ?? null;
  const matchStrength = recommendedMatch?.matchStrength ?? "none";
  const confidence = recommendedMatch?.percentage ?? 0;

  let decision: CaptureMezzoMatchDecision = "no_match";
  if (candidates.length === 0) {
    decision = "no_match";
  } else if (isCaptureMezzoMatchAutoSuggest(matchStrength) && candidates.length === 1) {
    decision = "auto_suggest";
  } else if (candidates.length > 0) {
    decision = "choose";
  }

  const reasonsHash = recommendedMatch
    ? hashCaptureMezzoMatchReasons(recommendedMatch.reasons)
    : "";

  return {
    ident,
    candidates,
    recommendedMatch,
    matchStrength,
    confidence,
    decision,
    reasonsSummary: buildReasonsSummary(recommendedMatch),
    reasonsHash,
  };
}
