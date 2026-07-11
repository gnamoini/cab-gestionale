import { createHash } from "node:crypto";
import { canonicalJsonStringify } from "@/lib/domain/technical-knowledge-base/hash";
import { createRandomUuid } from "@/lib/uuid/create-random-uuid";

export type GenerationContextInput = {
  technicalBlob: string;
  anomaliaText?: string;
  detailLevel: string;
  kbVersion: number;
  ricambiIds: string[];
  targetType?: string;
  matchedInterventoSlugs: string[];
};

export function buildGenerationContextHash(input: GenerationContextInput): string {
  const payload = {
    technicalBlob: input.technicalBlob.trim(),
    anomaliaText: (input.anomaliaText ?? "").trim(),
    detailLevel: input.detailLevel,
    kbVersion: input.kbVersion,
    ricambiIds: [...input.ricambiIds].filter(Boolean).sort(),
    targetType: input.targetType ?? "",
    matchedInterventoSlugs: [...input.matchedInterventoSlugs].sort(),
  };
  return createHash("sha256").update(canonicalJsonStringify(payload)).digest("hex");
}

export function newGenerationId(): string {
  return createRandomUuid();
}

const sequenceByContextHash = new Map<string, number>();

/** ponytail: in-memory sequence; produzione usa DB max(sequence)+1 per hash. */
export function nextGenerationSequence(contextHash: string, explicit?: number): number {
  if (explicit != null && explicit > 0) return explicit;
  const next = (sequenceByContextHash.get(contextHash) ?? 0) + 1;
  sequenceByContextHash.set(contextHash, next);
  return next;
}

export function resetGenerationSequences(): void {
  sequenceByContextHash.clear();
}
