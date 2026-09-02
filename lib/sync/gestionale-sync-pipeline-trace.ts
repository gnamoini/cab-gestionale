"use client";

import { incrementSyncMetric } from "@/lib/sync/gestionale-sync-metrics";

export type GestionaleSyncPipelineStage =
  | "realtime_received"
  | "self_echo_check"
  | "merge_attempt"
  | "dispatch_entered"
  | "policy_resolved"
  | "dirty_decision"
  | "dirty_marked"
  | "dirty_skipped"
  | "invalidated"
  | "scope_match"
  | "resume_check"
  | "resume_drift";

let lastStage: GestionaleSyncPipelineStage | null = null;
let lastStageDetail: Record<string, unknown> | null = null;

export function logGestionaleSyncPipelineStage(
  stage: GestionaleSyncPipelineStage,
  detail?: Record<string, unknown>,
): void {
  lastStage = stage;
  lastStageDetail = detail ?? null;
  incrementSyncMetric("gestionale_sync_pipeline_stage", 1, { stage });

  if (process.env.NODE_ENV === "development") {
    console.debug("[gestionale-sync-pipeline]", stage, detail ?? "");
  }
}

export function getLastGestionaleSyncPipelineStage(): GestionaleSyncPipelineStage | null {
  return lastStage;
}

export function getLastGestionaleSyncPipelineDetail(): Record<string, unknown> | null {
  return lastStageDetail;
}

export function resetGestionaleSyncPipelineTraceForTests(): void {
  lastStage = null;
  lastStageDetail = null;
}
