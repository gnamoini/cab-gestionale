import type { ReportRunStatus } from "@/lib/report/business-report/types";

export const GENERATING_STALE_TTL_MS = 30 * 60 * 1000;

export type LatestRunSnapshot = {
  id: string;
  status: ReportRunStatus;
  generationVersion: number;
  generatedAt: string;
};

export type GenerateAttemptResolution =
  | { action: "cache" }
  | { action: "already_running"; runId: string }
  | { action: "reactivate"; runId: string; generationVersion: number; reason: "failed_retry" | "stale_generating" }
  | { action: "insert"; generationVersion: number };

export function isGeneratingRunStale(generatedAt: string, nowMs: number = Date.now()): boolean {
  const started = Date.parse(generatedAt);
  if (!Number.isFinite(started)) return true;
  return nowMs - started >= GENERATING_STALE_TTL_MS;
}

/**
 * Pure generate lifecycle — regenerate always bumps version; technical retry reuses failed/stale row.
 */
export function resolveGenerateAttempt(input: {
  regenerate: boolean;
  hasCompleted: boolean;
  generating: LatestRunSnapshot | null;
  latestRun: LatestRunSnapshot | null;
  maxGenerationVersion: number;
  nowMs?: number;
}): GenerateAttemptResolution {
  if (input.regenerate) {
    return { action: "insert", generationVersion: Math.max(1, input.maxGenerationVersion + 1) };
  }

  if (input.hasCompleted) {
    return { action: "cache" };
  }

  if (input.generating) {
    if (!isGeneratingRunStale(input.generating.generatedAt, input.nowMs)) {
      return { action: "already_running", runId: input.generating.id };
    }
    return {
      action: "reactivate",
      runId: input.generating.id,
      generationVersion: input.generating.generationVersion,
      reason: "stale_generating",
    };
  }

  if (input.latestRun?.status === "failed") {
    return {
      action: "reactivate",
      runId: input.latestRun.id,
      generationVersion: input.latestRun.generationVersion,
      reason: "failed_retry",
    };
  }

  return { action: "insert", generationVersion: 1 };
}
