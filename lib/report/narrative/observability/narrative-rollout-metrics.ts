import type {
  ReportMetricObservabilityEvent,
  ReportMetricObservation,
} from "@/lib/report/observability/report-metric-observability";

export type RolloutMetricsSummary = {
  latencyP95: number | null;
  errorRate: number;
  emptyRate: number;
  sampleCount: number;
  qualityFailRate?: number;
  consumedRate?: number;
  tenantUnresolvedRate?: number;
  byFailureCode: Record<string, number>;
};

type ObservedEvent = { event: ReportMetricObservabilityEvent; payload: ReportMetricObservation };

function percentileP95(samples: number[]): number | null {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.ceil(0.95 * sorted.length) - 1;
  return sorted[Math.max(0, idx)] ?? null;
}

function filterByConsumerPath(events: ObservedEvent[], consumerPath: "legacy-analysis" | "narrative-v2") {
  return events.filter((e) => e.payload.consumerPath === consumerPath);
}

function buildRolloutMetrics(
  events: ObservedEvent[],
  consumerPath: "legacy-analysis" | "narrative-v2",
  options?: { trackQuality?: boolean; trackConsumed?: boolean; trackTenant?: boolean },
): RolloutMetricsSummary {
  const scoped = filterByConsumerPath(events, consumerPath);
  const completed = scoped.filter((e) =>
    e.event === "report_analysis_completed" || e.event === "narrative_generation_completed",
  );
  const failed = scoped.filter((e) =>
    e.event === "report_analysis_failed" || e.event === "narrative_generation_failed",
  );
  const empty = scoped.filter((e) => e.event === "report_analysis_empty");
  const qualityFailed = options?.trackQuality
    ? scoped.filter((e) => e.event === "narrative_quality_failed")
    : [];
  const consumed = options?.trackConsumed
    ? scoped.filter((e) => e.event === "narrative_consumed")
    : [];

  const attempts = completed.length + failed.length + empty.length + qualityFailed.length;
  const latencies = completed
    .map((e) => e.payload.executionTimeMs)
    .filter((ms): ms is number => typeof ms === "number");

  const byFailureCode: Record<string, number> = {};
  for (const e of [...failed, ...qualityFailed]) {
    const code = e.payload.message ?? "unknown";
    byFailureCode[code] = (byFailureCode[code] ?? 0) + 1;
  }

  let tenantUnresolved = 0;
  let tenantSamples = 0;
  if (options?.trackTenant) {
    for (const e of scoped) {
      if (e.payload.tenantResolved === undefined) continue;
      tenantSamples += 1;
      if (e.payload.tenantResolved === false) tenantUnresolved += 1;
    }
  }

  return {
    latencyP95: percentileP95(latencies),
    errorRate: attempts > 0 ? failed.length / attempts : 0,
    emptyRate: attempts > 0 ? empty.length / attempts : 0,
    sampleCount: attempts,
    qualityFailRate:
      options?.trackQuality && attempts > 0 ? qualityFailed.length / attempts : undefined,
    consumedRate:
      options?.trackConsumed && completed.length > 0 ? consumed.length / completed.length : undefined,
    tenantUnresolvedRate:
      options?.trackTenant && tenantSamples > 0 ? tenantUnresolved / tenantSamples : undefined,
    byFailureCode,
  };
}

export function buildReportAnalysisRolloutMetrics(events: ObservedEvent[]): RolloutMetricsSummary {
  return buildRolloutMetrics(events, "legacy-analysis");
}

export function buildNarrativeRolloutMetrics(events: ObservedEvent[]): RolloutMetricsSummary {
  return buildRolloutMetrics(events, "narrative-v2", {
    trackQuality: true,
    trackConsumed: true,
    trackTenant: true,
  });
}
