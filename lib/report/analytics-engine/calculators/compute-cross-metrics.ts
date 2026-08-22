import {
  computeCrossCostJob,
  computeCrossEfficiency,
  computeCrossPartsJob,
  computeCrossValueHour,
} from "@/lib/report/cross-analysis/build-report-cross-dto";
import { crossFormulaInputFromBundle } from "@/lib/report/analytics-engine/cross/cross-formula-input-from-bundle";
import type { AnalyticsCalculatorFn } from "@/lib/report/analytics-engine/calculator-context";
import {
  estimatedResult,
  partialResult,
  unavailableResult,
  verifiedResult,
} from "@/lib/report/analytics-engine/calculator-context";

function mapCrossResult(
  result: ReturnType<typeof computeCrossEfficiency>,
  formulaId: string,
  estimatedWhenAmber = false,
) {
  if (result.status === "available") {
    if (result.trust === "AMBER" && estimatedWhenAmber) {
      return estimatedResult(result.value, formulaId);
    }
    return verifiedResult(result.value, formulaId);
  }
  if (result.status === "not_loaded") {
    return partialResult(0, formulaId);
  }
  return unavailableResult(formulaId);
}

export const computeCrossEfficiencyMetric: AnalyticsCalculatorFn = (ctx) => {
  const input = crossFormulaInputFromBundle(ctx.bundle);
  return mapCrossResult(computeCrossEfficiency(input), "completedInPeriod / actualLaborHours", true);
};

export const computeCrossPartsJobMetric: AnalyticsCalculatorFn = (ctx) => {
  const input = crossFormulaInputFromBundle(ctx.bundle);
  return mapCrossResult(computeCrossPartsJob(input), "partsUsedQty / completedInPeriod");
};

export const computeCrossCostJobMetric: AnalyticsCalculatorFn = (ctx) => {
  const input = crossFormulaInputFromBundle(ctx.bundle);
  return mapCrossResult(computeCrossCostJob(input), "(movementValue + manodoperaCost) / completedInPeriod");
};

export const computeCrossValueHourMetric: AnalyticsCalculatorFn = (ctx) => {
  const input = crossFormulaInputFromBundle(ctx.bundle);
  if (!ctx.bundle.invoicesAvailable) {
    return partialResult(0, "invoicesBilled / totalHours");
  }
  return mapCrossResult(computeCrossValueHour(input), "invoicesBilled / totalHours");
};
