import "server-only";

import { reportMetricObserver } from "@/lib/report/observability/report-metric-observability";
import type { NarrativeQualityReport } from "@/lib/report/narrative/quality/narrative-quality.types";

const consumedDedupe = new Set<string>();

export type NarrativeGenerationTelemetry = {
  correlationId: string;
  outcome: "completed" | "failed";
  code?: string;
  latencyMs?: number;
  tenantResolved?: boolean;
  report?: NarrativeQualityReport;
};

export function emitNarrativeGenerationTelemetry(input: NarrativeGenerationTelemetry): void {
  const event =
    input.code === "quality_failed"
      ? ("narrative_quality_failed" as const)
      : input.outcome === "completed"
        ? ("narrative_generation_completed" as const)
        : ("narrative_generation_failed" as const);

  reportMetricObserver.emit(event, {
    consumer: "narrative",
    consumerPath: "narrative-v2",
    metricId: "report_narrative",
    message: input.code,
    executionTimeMs: input.latencyMs,
    ruleKey: input.correlationId,
    tenantResolved: input.tenantResolved,
  });
}

export function emitNarrativeConsumedTelemetry(input: {
  correlationId: string;
  dedupeKey: string;
  tenantResolved?: boolean;
}): void {
  if (consumedDedupe.has(input.dedupeKey)) return;
  consumedDedupe.add(input.dedupeKey);

  reportMetricObserver.emit("narrative_consumed", {
    consumer: "narrative",
    consumerPath: "narrative-v2",
    metricId: "report_narrative",
    ruleKey: input.correlationId,
    message: input.dedupeKey,
    tenantResolved: input.tenantResolved,
  });
}

/** Test-only */
export function clearNarrativeConsumedDedupe(): void {
  consumedDedupe.clear();
}
