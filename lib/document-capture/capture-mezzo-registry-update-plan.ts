import type { CaptureIngressoMergeResult } from "@/lib/document-capture/merge-capture-ingresso-with-linked-mezzo";
import { MEZZO_PERMANENT_FIELD_LABELS } from "@/lib/domain/mezzo/build-scheda-save-conflict-summary";
import type { MezzoPermanentFieldKey } from "@/lib/schede/scheda-ingresso-field-roles";

export type MezzoRegistryUpdatePlan = {
  mezzoId: string;
  fieldsToUpdate: MezzoPermanentFieldKey[];
};

export function buildMezzoRegistryUpdatePlan(input: {
  mezzoId: string;
  mergeResult: CaptureIngressoMergeResult;
  includeConflictsResolvedAsScan?: boolean;
  conflictResolutions?: Partial<
    Record<MezzoPermanentFieldKey, "registry" | "scan" | "manual">
  >;
}): MezzoRegistryUpdatePlan {
  const fields = new Set<MezzoPermanentFieldKey>();

  for (const missing of input.mergeResult.missingFromRegistry) {
    fields.add(missing.field);
  }

  if (input.includeConflictsResolvedAsScan && input.conflictResolutions) {
    for (const conflict of input.mergeResult.conflicts) {
      if (input.conflictResolutions[conflict.field] === "scan") {
        fields.add(conflict.field);
      }
    }
  }

  return {
    mezzoId: input.mezzoId,
    fieldsToUpdate: [...fields],
  };
}

export function describeRegistryUpdateRows(
  plan: MezzoRegistryUpdatePlan,
  mergeResult: CaptureIngressoMergeResult,
): Array<{ label: string; value: string }> {
  return plan.fieldsToUpdate.map((field) => {
    const missing = mergeResult.missingFromRegistry.find((m) => m.field === field);
    const conflict = mergeResult.conflicts.find((c) => c.field === field);
    const value = missing?.scannedValue ?? conflict?.scannedValue ?? "";
    return {
      label: MEZZO_PERMANENT_FIELD_LABELS[field],
      value,
    };
  });
}

export function registryFieldsAlreadyDecided(
  plan: MezzoRegistryUpdatePlan | null | undefined,
  conflictResolutions?: Partial<Record<MezzoPermanentFieldKey, "registry" | "scan" | "manual">>,
): MezzoPermanentFieldKey[] {
  const decided = new Set<MezzoPermanentFieldKey>(plan?.fieldsToUpdate ?? []);
  if (conflictResolutions) {
    for (const key of Object.keys(conflictResolutions) as MezzoPermanentFieldKey[]) {
      decided.add(key);
    }
  }
  return [...decided];
}
