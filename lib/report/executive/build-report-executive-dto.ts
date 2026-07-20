import { assertValidDrillDownRef } from "@/lib/report/contracts/drill-down-contract";
import {
  ECO_DA_INCASSARE_SOURCE_PENDING,
  ECO_FATTURATO_SOURCE_PENDING,
} from "@/lib/report/datasets/builders/shared";
import { sortedExecutiveMetrics } from "@/lib/report/executive/executive-metric-registry";
import { mergeExecutiveMetadata, trustFromSlice } from "@/lib/report/executive/merge-executive-metadata";
import { normalizeExecutiveSlices } from "@/lib/report/executive/normalize-executive-slices";
import {
  EXECUTIVE_CARD_CONTRACT_VERSION,
  EXECUTIVE_CONTRACT_VERSION,
  type BuildReportExecutiveInput,
  type ExecutiveCardDto,
  type ReportExecutiveDto,
} from "@/lib/report/executive/types";
import { getMetricDefinition } from "@/lib/report/metrics/get-metric-definition";
import { formatReportMetricValue } from "@/lib/report/metrics/format-report-metric-value";
import { reportMetricObserver } from "@/lib/report/observability/report-metric-observability";

const SLICE_WARNINGS: Record<string, string> = {
  eco_fatturato: ECO_FATTURATO_SOURCE_PENDING,
  eco_da_incassare: ECO_DA_INCASSARE_SOURCE_PENDING,
};

function cardWarnings(metricId: string, sliceStatus?: string): string[] | undefined {
  if (sliceStatus !== "partial" && sliceStatus !== "unavailable") return undefined;
  const code = SLICE_WARNINGS[metricId];
  return code ? [code] : undefined;
}

function emitContractViolation(
  metricId: string,
  violationType: "missing_metric" | "invalid_drilldown" | "missing_registry_entry",
  message: string,
): never {
  reportMetricObserver.emit("executive_contract_violation", {
    consumer: "executive",
    metricId,
    violationType,
    severity: "error",
    message,
  });
  throw new Error(message);
}

export function buildReportExecutiveDto(input: BuildReportExecutiveInput): ReportExecutiveDto {
  const bundle = {
    lavorazioni: input.lavorazioni,
    magazzino: input.magazzino,
    economico: input.economico,
  };
  const slices = normalizeExecutiveSlices(bundle);
  const defsById = new Map(sortedExecutiveMetrics().map((d) => [d.metricId, d]));
  const partialEmitted = new Set<string>();

  const cards: ExecutiveCardDto[] = slices.map((slice) => {
    const def = defsById.get(slice.metricId);
    if (!def) {
      emitContractViolation(slice.metricId, "missing_metric", `Executive definition missing for ${slice.metricId}`);
    }

    let registry;
    try {
      registry = getMetricDefinition(slice.metricId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      emitContractViolation(slice.metricId, "missing_registry_entry", message);
    }

    const value = typeof slice.value === "number" ? slice.value : Number(slice.value);
    const trust = trustFromSlice(slice);

    if (trust === "AMBER" && !partialEmitted.has(slice.metricId)) {
      partialEmitted.add(slice.metricId);
      reportMetricObserver.emit("executive_metric_partial", {
        consumer: "executive",
        metricId: slice.metricId,
        trust: "AMBER",
      });
    }

    const card: ExecutiveCardDto = {
      contractVersion: EXECUTIVE_CARD_CONTRACT_VERSION,
      metricId: slice.metricId,
      displayKey: def.displayKey,
      label: registry.label,
      value,
      formattedValue: formatReportMetricValue(value, registry.formatter ?? registry.unit),
      trust,
      drillDown: def.drillDown,
      warnings: cardWarnings(slice.metricId, slice.metricHealth?.status),
    };

    try {
      assertValidDrillDownRef(card.drillDown);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      emitContractViolation(slice.metricId, "invalid_drilldown", message);
    }

    return card;
  });

  const metadata = mergeExecutiveMetadata(input.childMetadata ?? [], slices, {
    requestedPeriod: input.requestedPeriod,
  });

  return {
    contractVersion: EXECUTIVE_CONTRACT_VERSION,
    cards,
    metadata,
  };
}
