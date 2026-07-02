import type { ComposedDescription } from "./types";
import type { GeneratedDescriptionLine } from "./types";

export type PersistGenerationPayload = {
  usage: {
    generationId: string;
    preventivoId?: string;
    lavorazioneId?: string;
    eventType: "generated" | "regenerated" | "operator_edit" | "approved";
    engineVersion: string;
    kbVersion: number;
    detailLevel: string;
    confidence: number;
    confidenceTier: string;
    confidenceFactors: ComposedDescription["meta"]["confidenceFactors"];
    generationContextHash: string;
    generationSequence: number;
    linesCount: number;
    fallbackUsed: boolean;
    fallbackReason?: string;
    aiPolishApplied: boolean;
    aiRejectReason?: string;
    semanticFingerprintPre?: string;
    semanticFingerprintPost?: string;
    createdBy?: string;
  };
  lines: {
    generationId: string;
    preventivoId?: string;
    activityId: string | null;
    text: string;
    sourceType: GeneratedDescriptionLine["sourceType"];
    sourceId: string;
    confidence: number;
    isVerifiedTechnical: boolean;
    sort: number;
    metadata?: Record<string, unknown>;
  }[];
};

export function buildPersistGenerationPayload(opts: {
  composed: ComposedDescription;
  preventivoId?: string;
  lavorazioneId?: string;
  eventType?: PersistGenerationPayload["usage"]["eventType"];
  createdBy?: string;
}): PersistGenerationPayload {
  const { composed, preventivoId, lavorazioneId, eventType = "generated", createdBy } = opts;
  const { meta, lines } = composed;

  return {
    usage: {
      generationId: meta.generationId,
      preventivoId,
      lavorazioneId,
      eventType,
      engineVersion: meta.engineVersion,
      kbVersion: meta.kbVersion,
      detailLevel: meta.detailLevel,
      confidence: meta.confidence,
      confidenceTier: meta.confidenceTier,
      confidenceFactors: meta.confidenceFactors,
      generationContextHash: meta.generationContextHash,
      generationSequence: meta.generationSequence,
      linesCount: lines.length,
      fallbackUsed: Boolean(meta.fallback?.used),
      fallbackReason: meta.fallback?.reason,
      aiPolishApplied: Boolean(meta.aiPolishApplied),
      aiRejectReason: meta.aiRejectReason,
      semanticFingerprintPre: meta.semanticFingerprintPre,
      semanticFingerprintPost: meta.semanticFingerprintPost,
      createdBy,
    },
    lines: lines.map((l) => ({
      generationId: meta.generationId,
      preventivoId,
      activityId: l.activityId,
      text: l.text,
      sourceType: l.sourceType,
      sourceId: l.sourceId,
      confidence: l.confidence,
      isVerifiedTechnical: l.isVerifiedTechnical,
      sort: l.sort,
      metadata: l.metadata,
    })),
  };
}

/** ponytail: persistenza client-side fino a wiring Supabase server action. */
const memoryGenerations = new Map<string, PersistGenerationPayload>();

export function persistGenerationClient(payload: PersistGenerationPayload): void {
  memoryGenerations.set(payload.usage.generationId, payload);
}

export function getPersistedGeneration(generationId: string): PersistGenerationPayload | undefined {
  return memoryGenerations.get(generationId);
}
