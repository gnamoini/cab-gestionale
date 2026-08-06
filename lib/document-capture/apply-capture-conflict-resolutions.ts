import type { CaptureConflictResolution } from "@/lib/document-capture/capture-mezzo-match-state";
import type { CaptureIngressoMergeResult } from "@/lib/document-capture/merge-capture-ingresso-with-linked-mezzo";
import type { MezzoPermanentFieldKey } from "@/lib/schede/scheda-ingresso-field-roles";
import type { SchedaIngressoFields } from "@/types/schede";

export function applyCaptureConflictResolutions(input: {
  mergeResult: CaptureIngressoMergeResult;
  conflictResolutions: Partial<Record<MezzoPermanentFieldKey, CaptureConflictResolution>>;
  manualOverrides?: Partial<SchedaIngressoFields>;
}): SchedaIngressoFields {
  const next = { ...input.mergeResult.fields };
  for (const conflict of input.mergeResult.conflicts) {
    const resolution = input.conflictResolutions[conflict.field];
    if (resolution === "scan") {
      (next as Record<string, unknown>)[conflict.field] = conflict.scannedValue;
    } else if (resolution === "registry") {
      (next as Record<string, unknown>)[conflict.field] = conflict.registryValue;
    } else if (resolution === "manual" && input.manualOverrides?.[conflict.field] !== undefined) {
      (next as Record<string, unknown>)[conflict.field] = String(
        input.manualOverrides[conflict.field] ?? "",
      );
    }
  }
  for (const missing of input.mergeResult.missingFromRegistry) {
    if (!input.conflictResolutions[missing.field]) {
      (next as Record<string, unknown>)[missing.field] = missing.scannedValue;
    }
  }
  return next;
}

export function defaultConflictResolutionForField(
  severity: "strong_identity" | "soft",
): CaptureConflictResolution {
  return severity === "strong_identity" ? "registry" : "registry";
}
