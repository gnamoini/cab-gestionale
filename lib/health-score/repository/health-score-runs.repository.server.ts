import "server-only";

import { createSupabaseServerServiceClient } from "@/src/lib/supabase/server-service-client";
import type { HealthScoreResult, InputSnapshot } from "@/lib/health-score/types";
import {
  HEALTH_SCORE_ENGINE_VERSION,
} from "@/lib/health-score/versions";
import { hashInputSnapshot } from "@/lib/health-score/engine/determinism";

export async function getLatestSmoothedScoreServer(
  engineVersion = HEALTH_SCORE_ENGINE_VERSION,
): Promise<number | null> {
  try {
    const sb = createSupabaseServerServiceClient();
    const { data } = await sb
      .from("health_score_runs")
      .select("score_smoothed")
      .eq("engine_version", engineVersion)
      .eq("status", "READY")
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.score_smoothed ?? null;
  } catch {
    return null;
  }
}

export async function persistHealthScoreRunServer(input: {
  result: HealthScoreResult;
  snapshot: InputSnapshot;
  configHash: string;
  durationMs: number;
}): Promise<void> {
  try {
    const sb = createSupabaseServerServiceClient();
    await sb.from("health_score_runs").insert({
      computed_at: input.result.computedAt,
      engine_version: input.result.engineVersion,
      config_version: input.result.configVersion,
      schema_version: input.result.schemaVersion,
      status: input.result.status,
      period_start: input.result.period.start.toISOString(),
      period_end: input.result.period.end.toISOString(),
      prev_period_start: input.result.prevPeriod.start.toISOString(),
      prev_period_end: input.result.prevPeriod.end.toISOString(),
      workshop_size: input.result.workshopSize,
      score_raw: input.result.scoreRaw,
      score_smoothed: input.result.score,
      label: input.result.label,
      tone: input.result.tone,
      input_snapshot: input.snapshot,
      input_hash: hashInputSnapshot(input.snapshot),
      config_hash: input.configHash,
      breakdown: input.result.breakdown,
      confidence_overall: input.result.confidenceOverall,
      data_quality_overall: input.result.dataQualityOverall,
      duration_ms: input.durationMs,
      cache_hit: input.result.cacheHit,
    });
  } catch (e) {
    console.warn("[health-score] persist run failed", e);
  }
}
