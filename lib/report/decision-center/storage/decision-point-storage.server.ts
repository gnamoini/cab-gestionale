import "server-only";

import { createSupabaseServerServiceClient } from "@/src/lib/supabase/server-service-client";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { DecisionCandidate, DecisionStatus } from "@/lib/report/decision-center/types";
import {
  DECISION_ENGINE_VERSION,
  PRIORITY_MODEL_VERSION,
} from "@/lib/report/decision-center/versions";
import type { PersistedDecisionRow } from "@/lib/report/decision-center/engine/merge-decision-with-persistence";

export type DecisionPointRow = PersistedDecisionRow & {
  period_from: string;
  period_to: string;
  compare_mode: string;
  rule_key: string;
  title: string;
  summary: string;
  rationale: string;
  priority: string;
  category: string;
  trust: string;
  evidence: Record<string, unknown>;
  condition_hash: string;
  source_report_run_id: string | null;
};

async function client(useServiceRole?: boolean) {
  return useServiceRole ? createSupabaseServerServiceClient() : createSupabaseServerUserClient();
}

function mapRow(row: Record<string, unknown>): DecisionPointRow {
  return row as unknown as DecisionPointRow;
}

export async function getDecisionPointById(
  id: string,
  useServiceRole?: boolean,
): Promise<DecisionPointRow | null> {
  try {
    const sb = await client(useServiceRole);
    const { data, error } = await sb.from("report_decision_points").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return mapRow(data);
  } catch {
    return null;
  }
}

export async function listDecisionPointsForPeriod(input: {
  periodFrom: string;
  periodTo: string;
  compareMode: string;
  useServiceRole?: boolean;
}): Promise<DecisionPointRow[]> {
  try {
    const sb = await client(input.useServiceRole);
    const { data, error } = await sb
      .from("report_decision_points")
      .select("*")
      .eq("period_from", input.periodFrom)
      .eq("period_to", input.periodTo)
      .eq("compare_mode", input.compareMode);
    if (error || !data) return [];
    return data.map(mapRow);
  } catch {
    return [];
  }
}

export async function upsertDecisionCandidates(input: {
  periodFrom: string;
  periodTo: string;
  compareMode: string;
  candidates: DecisionCandidate[];
  useServiceRole?: boolean;
}): Promise<void> {
  const sb = await client(input.useServiceRole);
  for (const c of input.candidates) {
    const existing = (
      await sb
        .from("report_decision_points")
        .select("id, status, acknowledged_at, monitoring_since, resolved_at, dismissed_at, dismissed_condition_hash, dismissed_by, acknowledged_by, resolved_by")
        .eq("period_from", input.periodFrom)
        .eq("period_to", input.periodTo)
        .eq("compare_mode", input.compareMode)
        .eq("candidate_fingerprint", c.candidateFingerprint)
        .maybeSingle()
    ).data;

    const payload = {
      candidate_fingerprint: c.candidateFingerprint,
      period_from: input.periodFrom,
      period_to: input.periodTo,
      compare_mode: input.compareMode,
      rule_key: c.ruleKey,
      title: c.title,
      summary: c.summary,
      rationale: c.rationale,
      priority: c.priority,
      category: c.category,
      trust: c.trust,
      evidence: c.evidence,
      condition_hash: c.conditionHash,
      engine_version: DECISION_ENGINE_VERSION,
      priority_model_version: PRIORITY_MODEL_VERSION,
      source_report_run_id: c.sourceReportRunId ?? null,
    };

    if (existing) {
      await sb
        .from("report_decision_points")
        .update({
          ...payload,
          status: existing.status,
          acknowledged_at: existing.acknowledged_at,
          monitoring_since: existing.monitoring_since,
          resolved_at: existing.resolved_at,
          dismissed_at: existing.dismissed_at,
          dismissed_condition_hash: existing.dismissed_condition_hash,
          acknowledged_by: existing.acknowledged_by,
          resolved_by: existing.resolved_by,
          dismissed_by: existing.dismissed_by,
        })
        .eq("id", existing.id);
    } else {
      await sb.from("report_decision_points").insert({ ...payload, status: "new" });
    }
  }
}

export async function updateDecisionStatus(input: {
  id: string;
  status: DecisionStatus;
  userId: string;
  dismissedConditionHash?: string;
  useServiceRole?: boolean;
}): Promise<DecisionPointRow | null> {
  const sb = await client(input.useServiceRole);
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status: input.status, updated_at: now };

  if (input.status === "acknowledged") {
    patch.acknowledged_by = input.userId;
    patch.acknowledged_at = now;
  }
  if (input.status === "monitoring") {
    patch.monitoring_since = now;
  }
  if (input.status === "resolved") {
    patch.resolved_by = input.userId;
    patch.resolved_at = now;
  }
  if (input.status === "dismissed") {
    patch.dismissed_by = input.userId;
    patch.dismissed_at = now;
    if (input.dismissedConditionHash) patch.dismissed_condition_hash = input.dismissedConditionHash;
  }

  const { data, error } = await sb
    .from("report_decision_points")
    .update(patch)
    .eq("id", input.id)
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data);
}

export async function updateDecisionAiOverlay(input: {
  candidateFingerprint: string;
  periodFrom: string;
  periodTo: string;
  compareMode: string;
  aiExplanation: string | null;
  aiStatus: "completed" | "unavailable";
  quality?: Record<string, unknown>;
}): Promise<void> {
  const sb = await client();
  await sb
    .from("report_decision_points")
    .update({
      ai_explanation: input.aiExplanation,
      ai_status: input.aiStatus,
      quality: input.quality ?? null,
    })
    .eq("period_from", input.periodFrom)
    .eq("period_to", input.periodTo)
    .eq("compare_mode", input.compareMode)
    .eq("candidate_fingerprint", input.candidateFingerprint);
}
