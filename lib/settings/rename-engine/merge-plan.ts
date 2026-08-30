/** Merge Engine — flusso separato dal Rename Engine (RFC Fase 9). */

export const MERGE_ENGINE_VERSION = "merge-engine-v1" as const;

export type MergePlan = {
  engineVersion: typeof MERGE_ENGINE_VERSION;
  canonicalEntityId: string;
  canonicalLabel: string;
  absorbedEntityId: string;
  absorbedLabel: string;
  correlationId: string;
};

export type MergeJobStatus = "draft" | "previewed" | "approved" | "running" | "completed" | "failed" | "cancelled";

/** ponytail: stub — implementazione completa in Fase 9 */
export function buildMergePlan(_input: {
  kind: string;
  canonicalLabel: string;
  absorbedLabel: string;
}): never {
  void _input;
  throw new Error("Merge Engine non ancora implementato. Usare Rename solo per stessa entità.");
}
