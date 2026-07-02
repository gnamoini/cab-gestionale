import {
  computeAggregateConfidence,
  confidenceTierFromScore,
  emptyConfidenceFactors,
  filterActivitiesByDetailLevel,
  loadPublishedTkbSnapshot,
  matchInterventi,
  pickPrimaryMatch,
  publishTkbDraft,
  resolveInterventoActivities,
  sortResolvedActivities,
  createTkbSeedDraft,
  resetMemorySnapshots,
} from "@/lib/domain/technical-knowledge-base";
import { pulisciDescrizioneLavorazioniSpecifiche } from "@/lib/preventivi/preventivi-struttura";
import { trasformaDescrizioneLavorazioni } from "@/lib/preventivi/trasforma-descrizione";
import { enrichFromRicambiMap } from "./ricambi-enricher";
import { legacyPrimaryLines, enrichWithLegacyLines, legacyChunksFromBlob } from "./legacy-enrichment";
import {
  aggregateSemanticFingerprint,
  linesToClienteText,
  validateNoAnonymousLines,
} from "./provenance";
import {
  buildGenerationContextHash,
  newGenerationId,
  nextGenerationSequence,
} from "./generation-identity";
import { resolveDetailLevel, DEFAULT_STYLE_PROFILE } from "./style-profile";
import { applyAiPolishToLines, DEFAULT_AI_POLISH_CONSTRAINTS, polishDescriptionWithAi } from "./ai-polish";
import type {
  ComposedDescription,
  ConfidenceFactors,
  DescriptionEngineInput,
  GeneratedDescriptionLine,
} from "./types";

let seedBootstrapped = false;

function isAiPolishEnabled(): boolean {
  return process.env.NEXT_PUBLIC_TDE_AI_POLISH === "1";
}

export function ensureTkbSeedPublished(): number {
  if (!seedBootstrapped) {
    resetMemorySnapshots();
    publishTkbDraft(createTkbSeedDraft(), { changeSummary: "Seed iniziale TKB" });
    seedBootstrapped = true;
  }
  const snap = loadPublishedTkbSnapshot();
  return snap.kbVersion;
}

function buildFactorsFromMatch(
  match: ReturnType<typeof pickPrimaryMatch>,
  legacyPenalty: number,
): ConfidenceFactors {
  if (!match) return { ...emptyConfidenceFactors(), legacyPenalty };
  return {
    keywordMatch: match.keywordMatch,
    componentMatch: match.componentMatch,
    symptomMatch: match.symptomMatch,
    compatibility: match.compatibility,
    legacyPenalty,
  };
}

function activitiesToLines(
  activities: ReturnType<typeof resolveInterventoActivities>,
  opts: {
    sourceType: GeneratedDescriptionLine["sourceType"];
    sourceId: string;
    confidence: number;
    sortStart: number;
  },
): GeneratedDescriptionLine[] {
  let sort = opts.sortStart;
  return activities.map((a) => ({
    activityId: a.activityId,
    text: a.text,
    sourceType: opts.sourceType,
    sourceId: opts.sourceId,
    confidence: opts.confidence,
    isVerifiedTechnical: true,
    sort: sort++,
  }));
}

/** Genera descrizione preventivo via TKB + legacy controllato. */
export function generatePreventivoDescription(input: DescriptionEngineInput): ComposedDescription {
  const kbVersion = input.kbVersion ?? ensureTkbSeedPublished();
  const snapshot = loadPublishedTkbSnapshot(kbVersion);
  const detailLevel = resolveDetailLevel(input.detailLevel);

  const matches = matchInterventi(snapshot, {
    lavorazioniText: input.technicalBlob,
    anomaliaText: input.anomaliaText,
    noteIntervento: input.noteIntervento,
    targetType: input.targetType,
    tipoAttrezzatura: input.tipoAttrezzatura,
    marcaModello: input.marcaModello,
  });

  const primary = pickPrimaryMatch(matches);
  const intervento = primary
    ? snapshot.interventi.find((i) => i.slug === primary.interventoSlug) ?? null
    : null;

  let lines: GeneratedDescriptionLine[] = [];
  let legacyPenalty = 0;

  if (intervento && primary) {
    const resolved = sortResolvedActivities(
      filterActivitiesByDetailLevel(resolveInterventoActivities(intervento, snapshot), detailLevel),
    );
    lines = activitiesToLines(resolved, {
      sourceType: "tkb_intervento",
      sourceId: intervento.slug,
      confidence: primary.score,
      sortStart: 1,
    });

    const activityIds = new Set(lines.map((l) => l.activityId).filter(Boolean) as string[]);
    lines.push(
      ...enrichFromRicambiMap({
        snapshot,
        intervento,
        interventoMatchScore: primary.score,
        confidenceTier: confidenceTierFromScore(computeAggregateConfidence(buildFactorsFromMatch(primary, 0))),
        ricambi: input.ricambi,
        existingActivityIds: activityIds,
        sortStart: lines.length + 1,
      }),
    );
  }

  const factors = buildFactorsFromMatch(primary, legacyPenalty);
  let confidence = computeAggregateConfidence(factors);
  let tier = confidenceTierFromScore(confidence);

  const unmatchedChunks = primary
    ? legacyChunksFromBlob(input.technicalBlob).filter((c) => {
        const low = c.toLowerCase();
        return !intervento?.keywords.some((k) => low.includes(k.slice(0, 8).toLowerCase()));
      })
    : legacyChunksFromBlob(input.technicalBlob);

  if (tier === "medium") {
    legacyPenalty = 0.15;
    lines.push(
      ...enrichWithLegacyLines({
        existingLines: lines,
        unmatchedChunks,
        ctx: input.ctx,
        maxLegacyLines: 3,
        sortStart: lines.length + 1,
        sourceType: "legacy_enrichment",
      }),
    );
  } else if (tier === "low" || !primary) {
    legacyPenalty = primary ? 0.25 : 0.4;
    const legacyLines = legacyPrimaryLines({ technicalBlob: input.technicalBlob, ctx: input.ctx });
    if (lines.length === 0) {
      lines = legacyLines.slice(0, DEFAULT_STYLE_PROFILE.maxLines[detailLevel]);
    } else {
      lines.push(
        ...enrichWithLegacyLines({
          existingLines: lines,
          unmatchedChunks,
          ctx: input.ctx,
          maxLegacyLines: 2,
          sortStart: lines.length + 1,
          sourceType: "legacy_enrichment",
        }),
      );
    }
  }

  const factorsFinal = buildFactorsFromMatch(primary, legacyPenalty);
  confidence = computeAggregateConfidence(factorsFinal);
  tier = confidenceTierFromScore(confidence);

  validateNoAnonymousLines(lines);

  const matchedSlugs = matches.slice(0, 3).map((m) => m.interventoSlug);
  const contextHash = buildGenerationContextHash({
    technicalBlob: input.technicalBlob,
    anomaliaText: input.anomaliaText,
    detailLevel,
    kbVersion,
    ricambiIds: input.ricambi.map((r) => r.ricambioId ?? "").filter(Boolean),
    targetType: input.targetType,
    matchedInterventoSlugs: matchedSlugs,
  });

  const generationId = newGenerationId();
  const generationSequence = nextGenerationSequence(contextHash, input.generationSequence);

  const semanticFingerprintPre = aggregateSemanticFingerprint(lines);
  let aiPolishResult: ReturnType<typeof polishDescriptionWithAi> | null = null;
  if (isAiPolishEnabled() && input.aiPolishFn) {
    aiPolishResult = polishDescriptionWithAi(lines, DEFAULT_AI_POLISH_CONSTRAINTS, input.aiPolishFn);
    if (aiPolishResult.applied) {
      lines = applyAiPolishToLines(lines, aiPolishResult);
    }
  }

  let clienteText = linesToClienteText(lines);
  clienteText = pulisciDescrizioneLavorazioniSpecifiche(clienteText);

  const usedLegacy = lines.some((l) => !l.isVerifiedTechnical);
  const meta = {
    engineVersion: "tde_v1" as const,
    generationId,
    generationContextHash: contextHash,
    generationSequence,
    kbVersion,
    detailLevel,
    confidence,
    confidenceTier: tier,
    confidenceFactors: factorsFinal,
    generatedAt: new Date().toISOString(),
    matchedEntries: matches.slice(0, 5).map((m) => ({
      slug: m.interventoSlug,
      score: m.score,
      matchedBy: m.matchedBy,
    })),
    legacyEnrichment: usedLegacy
      ? { chunks: unmatchedChunks.slice(0, 3), linesAdded: lines.filter((l) => !l.isVerifiedTechnical).length }
      : undefined,
    fallback: !primary
      ? { used: true, reason: "no_kb_match", legacyEngine: true as const }
      : tier === "low"
        ? { used: true, reason: "low_confidence", legacyEngine: true as const }
        : undefined,
    aiPolishApplied: Boolean(aiPolishResult?.applied),
    aiRejectReason: aiPolishResult && !aiPolishResult.applied ? aiPolishResult.rejectReason : undefined,
    semanticFingerprintPre,
    semanticFingerprintPost: aiPolishResult?.applied ? aggregateSemanticFingerprint(lines) : undefined,
  };

  return { lines, meta, clienteText };
}

/** Fallback legacy-only (compat storico). */
export function generateLegacyOnlyDescription(input: DescriptionEngineInput): ComposedDescription {
  const text = trasformaDescrizioneLavorazioni(input.technicalBlob, input.ctx);
  const clienteText = pulisciDescrizioneLavorazioniSpecifiche(text);
  const lines: GeneratedDescriptionLine[] = clienteText
    .split("\n")
    .map((l) => l.replace(/^-\s*/, "").trim())
    .filter(Boolean)
    .map((line, idx) => ({
      activityId: null,
      text: line,
      sourceType: "legacy_heuristic" as const,
      sourceId: `legacy-fallback:${idx}`,
      confidence: 0.25,
      isVerifiedTechnical: false,
      sort: idx + 1,
    }));

  validateNoAnonymousLines(lines);

  const generationId = newGenerationId();
  const contextHash = buildGenerationContextHash({
    technicalBlob: input.technicalBlob,
    detailLevel: "standard",
    kbVersion: 0,
    ricambiIds: [],
    matchedInterventoSlugs: [],
  });

  return {
    lines,
    clienteText,
    meta: {
      engineVersion: "legacy_v1",
      generationId,
      generationContextHash: contextHash,
      generationSequence: 1,
      kbVersion: 0,
      detailLevel: "standard",
      confidence: 0.25,
      confidenceTier: "low",
      confidenceFactors: { ...emptyConfidenceFactors(), legacyPenalty: 0.4 },
      generatedAt: new Date().toISOString(),
      matchedEntries: [],
      fallback: { used: true, reason: "legacy_only", legacyEngine: true },
      aiPolishApplied: false,
    },
  };
}

export function resetDescriptionEngineDevState(): void {
  seedBootstrapped = false;
  resetMemorySnapshots();
}
