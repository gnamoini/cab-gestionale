import "server-only";

export type BusinessReportObservabilityPayload = {
  reportRunId: string;
  reportType: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  aiStatus: string;
  generationDurationMs: number;
  llmDurationMs?: number;
  metricCount?: number;
  insightCount?: number;
  claimCount?: number;
  failureReason?: string;
};

/** Structured log — no secrets/tokens. */
export function logBusinessReportObservability(payload: BusinessReportObservabilityPayload): void {
  console.info("[business-report]", JSON.stringify(payload));
}
