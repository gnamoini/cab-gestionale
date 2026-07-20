import type { AnalyticsDatasetBundle } from "@/lib/report/analytics/analytics-dataset-bundle";
import { sortedCrossMetrics, type CrossMetricDefinition } from "@/lib/report/cross-analysis/cross-metric-registry";
import { mergeCrossMetadata } from "@/lib/report/cross-analysis/merge-cross-metadata";
import {
  crossFormulaInputFromDerived,
  normalizeCrossInput,
} from "@/lib/report/cross-analysis/normalize-cross-input";
import {
  CROSS_CONTRACT_VERSION,
  type CrossFormulaInput,
  type CrossMetricDto,
  type ReportCrossDto,
} from "@/lib/report/cross-analysis/types";
import { getMetricDefinition } from "@/lib/report/metrics/get-metric-definition";
import { formatReportMetricValue } from "@/lib/report/metrics/format-report-metric-value";
import { reportMetricObserver } from "@/lib/report/observability/report-metric-observability";
import type { ReportAnalyticsDerivedSnapshot } from "@/lib/report/report-domain-types";
import type { ReportMetadataEnvelope, TrustStatus } from "@/lib/report/contracts/metadata-envelope";

const CROSS_SOURCE_PENDING = "cross_source_pending";

type MetricComputeResult =
  | { status: "available"; value: number; trust: TrustStatus }
  | { status: "not_loaded"; trust: TrustStatus; warnings: string[] }
  | { status: "not_available"; trust: TrustStatus; warnings?: string[] };

function fmtN(n: number): string {
  return n.toLocaleString("it-IT");
}

function fmtEur(n: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function computeCrossEfficiency(input: CrossFormulaInput): MetricComputeResult {
  const op = input.operational;
  const lab = input.labor;
  if (!op || !lab) {
    return { status: "not_loaded", trust: "AMBER", warnings: [CROSS_SOURCE_PENDING] };
  }
  if (lab.totalHours <= 0 || op.completedInPeriod <= 0) {
    return { status: "not_available", trust: "GREEN" };
  }
  const value = Math.round((op.completedInPeriod / lab.totalHours) * 100) / 100;
  return { status: "available", value, trust: "GREEN" };
}

function computeCrossPartsJob(input: CrossFormulaInput): MetricComputeResult {
  const wh = input.warehouse;
  const op = input.operational;
  if (!wh || !op) {
    return { status: "not_loaded", trust: "AMBER", warnings: [CROSS_SOURCE_PENDING] };
  }
  if (op.completedInPeriod <= 0) {
    return { status: "not_available", trust: "GREEN" };
  }
  const value = Math.round((wh.partsUsedQty / op.completedInPeriod) * 10) / 10;
  return { status: "available", value, trust: "GREEN" };
}

function computeCrossCostJob(input: CrossFormulaInput): MetricComputeResult {
  const op = input.operational;
  const ricambiCost = input.warehouse?.movementValue ?? 0;
  const manodoperaCost = input.labor?.manodoperaCost ?? 0;
  if (!op) {
    return { status: "not_loaded", trust: "AMBER", warnings: [CROSS_SOURCE_PENDING] };
  }
  if (op.completedInPeriod <= 0) {
    return { status: "not_available", trust: "GREEN" };
  }
  const value =
    Math.round(((ricambiCost + manodoperaCost) / op.completedInPeriod) * 100) / 100;
  return { status: "available", value, trust: "GREEN" };
}

function computeCrossValueHour(input: CrossFormulaInput): MetricComputeResult {
  const eco = input.economic;
  const lab = input.labor;
  if (!eco || !lab) {
    return { status: "not_loaded", trust: "AMBER", warnings: [CROSS_SOURCE_PENDING] };
  }
  if (lab.totalHours <= 0 || eco.invoicesBilled <= 0) {
    return { status: "not_available", trust: "GREEN" };
  }
  const value = Math.round((eco.invoicesBilled / lab.totalHours) * 100) / 100;
  return { status: "available", value, trust: "GREEN" };
}

const COMPUTE_BY_ID = {
  cross_efficiency: computeCrossEfficiency,
  cross_parts_job: computeCrossPartsJob,
  cross_cost_job: computeCrossCostJob,
  cross_value_hour: computeCrossValueHour,
} as const;

function emitContractViolation(
  metricId: string,
  violationType: "missing_metric" | "invalid_input" | "missing_registry_entry",
  message: string,
): never {
  reportMetricObserver.emit("cross_contract_violation", {
    consumer: "cross-analysis",
    metricId,
    violationType,
    severity: "error",
    message,
  });
  throw new Error(message);
}

function buildMetricDto(
  def: CrossMetricDefinition,
  input: CrossFormulaInput,
  partialEmitted: Set<string>,
): CrossMetricDto {
  const compute = COMPUTE_BY_ID[def.metricId as keyof typeof COMPUTE_BY_ID];
  if (!compute) {
    emitContractViolation(def.metricId, "missing_metric", `No compute for ${def.metricId}`);
  }

  let registry;
  try {
    registry = getMetricDefinition(def.metricId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    emitContractViolation(def.metricId, "missing_registry_entry", message);
  }

  const result = compute(input);
  let value = 0;
  let trust: TrustStatus = "GREEN";
  let warnings: string[] | undefined;

  if (result.status === "available") {
    value = result.value;
    trust = result.trust;
  } else if (result.status === "not_loaded") {
    trust = result.trust;
    warnings = result.warnings;
  } else {
    trust = result.trust;
    warnings = result.warnings;
  }

  if (trust === "AMBER" && !partialEmitted.has(def.metricId)) {
    partialEmitted.add(def.metricId);
    reportMetricObserver.emit("cross_metric_partial", {
      consumer: "cross-analysis",
      metricId: def.metricId,
      trust: "AMBER",
      sourceDatasets: def.sourceDatasets,
    });
  }

  const formatter = registry.formatter ?? registry.unit;
  const formattedValue =
    result.status === "available" ? formatReportMetricValue(value, formatter) : "—";

  return {
    metricId: def.metricId,
    displayKey: def.displayKey,
    value,
    formattedValue,
    trust,
    sourceDatasets: [...def.sourceDatasets],
    warnings,
  };
}

export type BuildReportCrossInput = {
  bundle: AnalyticsDatasetBundle;
  requestedPeriod?: ReportMetadataEnvelope["requestedPeriod"];
};

export function buildReportCrossDto(input: BuildReportCrossInput): ReportCrossDto;
export function buildReportCrossDto(
  bundle: AnalyticsDatasetBundle,
  opts?: { requestedPeriod?: ReportMetadataEnvelope["requestedPeriod"] },
): ReportCrossDto;
export function buildReportCrossDto(
  bundleOrInput: AnalyticsDatasetBundle | BuildReportCrossInput,
  opts?: { requestedPeriod?: ReportMetadataEnvelope["requestedPeriod"] },
): ReportCrossDto {
  const bundle =
    "bundle" in bundleOrInput ? bundleOrInput.bundle : bundleOrInput;
  const requestedPeriod =
    "bundle" in bundleOrInput ? bundleOrInput.requestedPeriod : opts?.requestedPeriod;

  const formulaInput = normalizeCrossInput(bundle);
  const partialEmitted = new Set<string>();
  const metrics = sortedCrossMetrics().map((def) =>
    buildMetricDto(def, formulaInput, partialEmitted),
  );

  const metadata = mergeCrossMetadata(bundle.metadata.childMetadata, metrics, {
    requestedPeriod,
  });

  return {
    contractVersion: CROSS_CONTRACT_VERSION,
    metrics,
    metadata,
  };
}

/** @deprecated adapter path — uses same formula SSOT via derived snapshot normalization. */
export function buildReportCrossDtoFromDerived(
  derived: ReportAnalyticsDerivedSnapshot,
  opts?: { requestedPeriod?: ReportMetadataEnvelope["requestedPeriod"] },
): ReportCrossDto {
  const formulaInput = crossFormulaInputFromDerived(derived);
  const partialEmitted = new Set<string>();
  const metrics = sortedCrossMetrics().map((def) =>
    buildMetricDto(def, formulaInput, partialEmitted),
  );
  const metadata = mergeCrossMetadata([], metrics, { requestedPeriod: opts?.requestedPeriod });
  return {
    contractVersion: CROSS_CONTRACT_VERSION,
    metrics,
    metadata,
  };
}

export {
  computeCrossEfficiency,
  computeCrossPartsJob,
  computeCrossCostJob,
  computeCrossValueHour,
  fmtN,
  fmtEur,
};
