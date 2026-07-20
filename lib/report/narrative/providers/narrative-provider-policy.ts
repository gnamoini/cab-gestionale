import { readRuntimeTimeoutMs } from "@/lib/ai/runtime/env-reader";

export const NARRATIVE_PROVIDER_TIMEOUT_MS = 45_000 as const;
export const NARRATIVE_PROVIDER_TEMPERATURE = 0.3 as const;
export const NARRATIVE_PROVIDER_OPERATION = "report_narrative" as const;

/** min(readRuntimeTimeoutMs(), NARRATIVE_PROVIDER_TIMEOUT_MS) — passed to aiService.generateObject */
export function resolveNarrativeProviderTimeoutMs(): number {
  const runtime = readRuntimeTimeoutMs();
  return runtime > NARRATIVE_PROVIDER_TIMEOUT_MS ? NARRATIVE_PROVIDER_TIMEOUT_MS : runtime;
}
