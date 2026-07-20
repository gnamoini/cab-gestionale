import "server-only";

import { reportMetricObserver } from "@/lib/report/observability/report-metric-observability";

export function emitReportAnalysisTelemetry(input: {
  outcome: "completed" | "failed" | "empty";
  latencyMs: number;
  code?: string;
}): void {
  const event =
    input.outcome === "completed"
      ? ("report_analysis_completed" as const)
      : input.outcome === "empty"
        ? ("report_analysis_empty" as const)
        : ("report_analysis_failed" as const);

  reportMetricObserver.emit(event, {
    consumerPath: "legacy-analysis",
    metricId: "report_analysis",
    message: input.code,
    executionTimeMs: input.latencyMs,
  });
}
