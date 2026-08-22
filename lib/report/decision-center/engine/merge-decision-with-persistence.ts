import type { DecisionCandidate, DecisionStatus, ReportDecisionPoint } from "@/lib/report/decision-center/types";

export type PersistedDecisionRow = {
  id: string;
  candidate_fingerprint: string;
  status: DecisionStatus;
  condition_hash: string;
  dismissed_condition_hash: string | null;
  ai_explanation: string | null;
  ai_status: "completed" | "unavailable" | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  dismissed_at: string | null;
  engine_version: string;
  priority_model_version: string;
  created_at: string;
  updated_at: string;
};

/** C1: preserve user status on regeneration. C6: hide dismissed unless condition changed. */
export function mergeCandidatesWithPersistence(
  candidates: DecisionCandidate[],
  persisted: PersistedDecisionRow[],
  options?: { includeDismissed?: boolean },
): ReportDecisionPoint[] {
  const byFingerprint = new Map(persisted.map((p) => [p.candidate_fingerprint, p]));
  const now = new Date().toISOString();
  const out: ReportDecisionPoint[] = [];

  for (const c of candidates) {
    const row = byFingerprint.get(c.candidateFingerprint);
    const status: DecisionStatus = row?.status ?? "new";

    if (
      status === "dismissed" &&
      !options?.includeDismissed &&
      row?.dismissed_condition_hash === c.conditionHash
    ) {
      continue;
    }

    out.push({
      ...c,
      id: row?.id ?? c.candidateId,
      status,
      engineVersion: row?.engine_version ?? "1.0.0",
      priorityModelVersion: row?.priority_model_version ?? "1.0.0",
      aiExplanation: row?.ai_explanation,
      aiStatus: row?.ai_status ?? undefined,
      dismissedConditionHash: row?.dismissed_condition_hash,
      acknowledgedAt: row?.acknowledged_at,
      resolvedAt: row?.resolved_at,
      dismissedAt: row?.dismissed_at,
      generatedAt: row?.created_at ?? now,
    });
  }

  return out;
}

export function shouldResurfaceDismissed(
  row: PersistedDecisionRow,
  candidate: DecisionCandidate,
): boolean {
  if (row.status !== "dismissed") return true;
  return row.dismissed_condition_hash !== candidate.conditionHash;
}
