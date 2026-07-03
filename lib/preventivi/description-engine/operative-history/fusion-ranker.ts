import type { DescriptionEngineMeta, GeneratedDescriptionLine } from "../types";

type OperativeHistoryMeta = NonNullable<DescriptionEngineMeta["operativeHistory"]>;
import {
  pickHistorySourceType,
  shouldPreferHistory,
  type OperativeHistoryCandidate,
} from "./history-ranker";

export function historyLinesToGenerated(
  candidate: OperativeHistoryCandidate,
  sortStart = 1,
): GeneratedDescriptionLine[] {
  const sourceType = pickHistorySourceType(candidate.tier);
  return candidate.lines.map((text, i) => ({
    activityId: null,
    text,
    sourceType,
    sourceId: `history:${candidate.caseId}`,
    confidence: candidate.finalScore,
    isVerifiedTechnical: false,
    sort: sortStart + i,
    metadata: {
      operativeHistoryTier: candidate.tier,
      mezzoScore: candidate.mezzoScore,
      lavorazioneScore: candidate.lavorazioneScore,
    },
  }));
}

export function fuseWithOperativeHistory(opts: {
  tkbLines: GeneratedDescriptionLine[];
  tkbScore: number;
  historyCandidates: OperativeHistoryCandidate[];
}): { lines: GeneratedDescriptionLine[]; historyMeta?: OperativeHistoryMeta } {
  const top = opts.historyCandidates[0];
  if (shouldPreferHistory(top, opts.tkbScore) && top) {
    return {
      lines: historyLinesToGenerated(top),
      historyMeta: {
        candidatesEvaluated: opts.historyCandidates.length,
        topCaseId: top.caseId,
        topTier: top.tier,
        historyScore: top.finalScore,
        tkbScore: opts.tkbScore,
        fusedScore: top.finalScore,
        clientBoostApplied: top.tier === "same_client",
      },
    };
  }

  if (top && top.finalScore > 0.5) {
    const enrich = historyLinesToGenerated(top, opts.tkbLines.length + 1).slice(0, 2);
    return {
      lines: [...opts.tkbLines, ...enrich],
      historyMeta: {
        candidatesEvaluated: opts.historyCandidates.length,
        topCaseId: top.caseId,
        topTier: top.tier,
        historyScore: top.finalScore,
        tkbScore: opts.tkbScore,
        fusedScore: opts.tkbScore,
        clientBoostApplied: false,
      },
    };
  }

  return { lines: opts.tkbLines };
}
