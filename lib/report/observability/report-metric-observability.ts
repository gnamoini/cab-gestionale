import type { TrustStatus } from "@/lib/report/contracts/metadata-envelope";

export type ReportMetricConsumer = "executive" | "cross-analysis" | "insight" | "narrative";

export type ReportConsumerPath = "legacy-analysis" | "narrative-v2";

export type ReportMetricObservabilityEvent =
  | "metric_calculation_failed"
  | "metric_parity_failed"
  | "metric_freshness_exceeded"
  | "metric_trust_degraded"
  | "executive_payload_generated"
  | "executive_metric_partial"
  | "executive_contract_violation"
  | "cross_payload_generated"
  | "cross_metric_partial"
  | "cross_contract_violation"
  | "insight_payload_generated"
  | "insight_rule_skipped"
  | "insight_contract_violation"
  | "insight_telemetry_summary"
  | "narrative_generation_completed"
  | "narrative_generation_failed"
  | "narrative_quality_failed"
  | "narrative_consumed"
  | "report_analysis_completed"
  | "report_analysis_failed"
  | "report_analysis_empty";

export type ExecutiveContractViolationType =
  | "missing_metric"
  | "invalid_drilldown"
  | "missing_registry_entry";

export type CrossContractViolationType =
  | "missing_metric"
  | "invalid_input"
  | "missing_registry_entry";

export type InsightContractViolationType = "missing_registry_entry";

export type InsightSkipObservabilityReason =
  | "deferred"
  | "missing_data"
  | "trust_blocked"
  | "condition_false";

export type ReportMetricObservation = {
  consumer?: ReportMetricConsumer;
  consumerPath?: ReportConsumerPath;
  tenantResolved?: boolean;
  metricId: string;
  metricIds?: string[];
  executionTimeMs?: number;
  errorRate?: number;
  freshnessLag?: number;
  parityStatus?: "pass" | "fail" | "skipped";
  message?: string;
  at?: string;
  trust?: TrustStatus;
  sourceDatasets?: string[];
  cardCount?: number;
  partialMetricIds?: string[];
  violationType?: ExecutiveContractViolationType | CrossContractViolationType | InsightContractViolationType;
  severity?: "error" | "warning" | "info";
  ruleKey?: string;
  ruleVersion?: number;
  reason?: InsightSkipObservabilityReason;
};

export type ReportMetricObserverSink = (
  event: ReportMetricObservabilityEvent,
  payload: ReportMetricObservation,
) => void;

const observations: { event: ReportMetricObservabilityEvent; payload: ReportMetricObservation }[] = [];
let sink: ReportMetricObserverSink | null = null;

function defaultSink(
  event: ReportMetricObservabilityEvent,
  payload: ReportMetricObservation,
): void {
  observations.push({ event, payload });
}

export const reportMetricObserver = {
  emit(event: ReportMetricObservabilityEvent, payload: ReportMetricObservation): void {
    const enriched: ReportMetricObservation = {
      ...payload,
      at: payload.at ?? new Date().toISOString(),
    };
    (sink ?? defaultSink)(event, enriched);
  },
  /** Test-only: swap sink (telemetry/APM in Sprint 3+). */
  setSink(next: ReportMetricObserverSink | null): void {
    sink = next;
  },
  /** Test-only: read default buffer. */
  drain(): { event: ReportMetricObservabilityEvent; payload: ReportMetricObservation }[] {
    const copy = [...observations];
    observations.length = 0;
    return copy;
  },
};
