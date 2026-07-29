import type { MezzoPermanentFieldKey } from "@/lib/schede/scheda-ingresso-field-roles";

export type CaptureConflictResolution = "registry" | "scan" | "manual";

export type CaptureMezzoMatchState =
  | "not_checked"
  | "no_candidates"
  | "candidate_found"
  | "conflict_pending"
  | "confirmed"
  | "dismissed"
  | "manual_selected"
  | "force_new_mezzo";

export const STRONG_IDENTITY_FIELDS = new Set<MezzoPermanentFieldKey>([
  "targa",
  "matricola",
  "vin",
]);

export function isStrongIdentityField(field: MezzoPermanentFieldKey): boolean {
  return STRONG_IDENTITY_FIELDS.has(field);
}

export type CaptureMergeConflict = {
  field: MezzoPermanentFieldKey;
  severity: "strong_identity" | "soft";
};

export function hasUnresolvedStrongIdentityConflicts(
  conflicts: readonly CaptureMergeConflict[],
  conflictResolutions: Partial<Record<MezzoPermanentFieldKey, CaptureConflictResolution>>,
): boolean {
  return conflicts.some(
    (c) => c.severity === "strong_identity" && !conflictResolutions[c.field],
  );
}

export function deriveMezzoMatchStateFromMerge(
  current: CaptureMezzoMatchState,
  conflicts: readonly CaptureMergeConflict[],
  conflictResolutions: Partial<Record<MezzoPermanentFieldKey, CaptureConflictResolution>>,
): CaptureMezzoMatchState {
  if (current === "dismissed" || current === "force_new_mezzo" || current === "confirmed") {
    return current;
  }
  if (hasUnresolvedStrongIdentityConflicts(conflicts, conflictResolutions)) {
    return "conflict_pending";
  }
  if (current === "conflict_pending" && !hasUnresolvedStrongIdentityConflicts(conflicts, conflictResolutions)) {
    return "candidate_found";
  }
  return current;
}

export function canConfirmCaptureMezzoMatch(input: {
  state: CaptureMezzoMatchState;
  matchStrength: "exact_identity" | "strong" | "weak" | "none";
  conflicts: readonly CaptureMergeConflict[];
  conflictResolutions: Partial<Record<MezzoPermanentFieldKey, CaptureConflictResolution>>;
}): boolean {
  if (input.state === "dismissed" || input.state === "force_new_mezzo") return false;
  if (input.matchStrength === "none" || input.matchStrength === "weak") return false;
  if (hasUnresolvedStrongIdentityConflicts(input.conflicts, input.conflictResolutions)) {
    return false;
  }
  return (
    input.state === "candidate_found" ||
    input.state === "conflict_pending" ||
    input.state === "manual_selected"
  );
}

export function initialMezzoMatchStateFromResolution(input: {
  decision: "auto_suggest" | "choose" | "no_match";
  resumeState?: CaptureMezzoMatchState | null;
}): CaptureMezzoMatchState {
  if (input.resumeState === "dismissed") return "dismissed";
  if (input.resumeState === "force_new_mezzo") return "force_new_mezzo";
  if (input.resumeState === "confirmed") return "confirmed";
  if (input.resumeState === "manual_selected") return "manual_selected";
  if (input.decision === "no_match") return "no_candidates";
  return "candidate_found";
}

export type CaptureMezzoMatchDraft = {
  state: CaptureMezzoMatchState;
  linkedMezzoId?: string | null;
  recommendedMezzoId?: string | null;
  selectedCandidateScore?: number;
  selectedCandidateReasonsHash?: string;
  conflictResolutions?: Partial<Record<MezzoPermanentFieldKey, CaptureConflictResolution>>;
  registryUpdatePlan?: import("@/lib/document-capture/capture-mezzo-registry-update-plan").MezzoRegistryUpdatePlan | null;
};

export function shouldResetMezzoMatchOnResume(input: {
  storedReasonsHash?: string;
  currentReasonsHash: string;
  state: CaptureMezzoMatchState;
}): boolean {
  if (input.state === "dismissed" || input.state === "force_new_mezzo") return false;
  if (!input.storedReasonsHash) return false;
  return input.storedReasonsHash !== input.currentReasonsHash;
}
