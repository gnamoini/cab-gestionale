import type { AiProviderKeyRow, IngestMode } from "@/lib/ai/runtime/types";

export function resolveIngestMode(
  fingerprint: string,
  existing: AiProviderKeyRow | undefined,
): IngestMode {
  if (!existing) return "NEW";
  if (existing.key_fingerprint === fingerprint) {
    if (
      existing.status === "invalid" ||
      (existing.status === "cooldown" &&
        existing.cooldown_until &&
        new Date(existing.cooldown_until).getTime() <= Date.now())
    ) {
      return "RECOVERY";
    }
    return "EXISTING";
  }
  return "NEW";
}

/** Prefer fingerprint match; fall back to provider+slot for env rotation on fixed slots. */
export function pickExistingKeyRow(
  byFingerprint: AiProviderKeyRow | null | undefined,
  bySlot: AiProviderKeyRow | null | undefined,
): AiProviderKeyRow | undefined {
  return byFingerprint ?? bySlot ?? undefined;
}
