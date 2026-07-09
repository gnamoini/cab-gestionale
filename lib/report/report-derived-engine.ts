import {
  buildCrossAnalytics,
  buildEconomicAnalytics,
  buildLaborAnalytics,
  buildOperationalAnalytics,
  buildWarehouseAnalytics,
  type EconomicAnalyticsBuildInput,
  type LaborAnalyticsBuildInput,
  type OperationalAnalyticsBuildInput,
  type WarehouseAnalyticsBuildInput,
} from "@/lib/report/report-domain-analytics";
import type { DerivedKey, ReportAnalyticsDerivedSnapshot } from "@/lib/report/report-domain-types";

export const DERIVED_PREFETCH_PRIORITY = {
  high: ["operational", "economic"] as const,
  medium: ["warehouse"] as const,
  low: ["labor"] as const,
} as const;

export type DerivedPrefetchPriority = keyof typeof DERIVED_PREFETCH_PRIORITY;

export function computeOperationalDerived(input: OperationalAnalyticsBuildInput) {
  return buildOperationalAnalytics(input);
}

export function computeWarehouseDerived(input: WarehouseAnalyticsBuildInput) {
  return buildWarehouseAnalytics(input);
}

export function computeLaborDerived(input: LaborAnalyticsBuildInput) {
  return buildLaborAnalytics(input);
}

export function computeEconomicDerived(input: EconomicAnalyticsBuildInput) {
  return buildEconomicAnalytics(input);
}

export function computeCrossDerived(derived: ReportAnalyticsDerivedSnapshot) {
  return buildCrossAnalytics(derived);
}

export function prefetchDerivedKeys(priority: DerivedPrefetchPriority): readonly DerivedKey[] {
  return DERIVED_PREFETCH_PRIORITY[priority];
}
