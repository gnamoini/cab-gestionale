export type {
  AnalyticsHoursResult,
  EmployeeUtilizationResult,
  EmployeeUtilizationRow,
  EstimateVsActualResult,
  EstimateVsActualRow,
  HourKind,
  HoursConfidence,
  HoursConsistency,
  HoursIntegrityIssue,
  HoursIntegritySummary,
  MetricHourDefinition,
} from "@/lib/analytics/hours/types";

export { getPresenceHours } from "@/lib/analytics/hours/get-presence-hours";
export {
  getActualLaborHoursFromRow,
  sumActualLaborHours,
} from "@/lib/analytics/hours/get-actual-labor-hours";
export {
  getEstimatedLaborHoursFromPreventivo,
  sumEstimatedLaborHours,
} from "@/lib/analytics/hours/get-estimated-labor-hours";
export { getEmployeeUtilization } from "@/lib/analytics/hours/get-employee-utilization";
export { getEstimateVsActualDelta } from "@/lib/analytics/hours/get-estimate-vs-actual";
export { hoursIntegrityCheck } from "@/lib/analytics/hours/hours-integrity-check";
export { sumActualLaborHoursInRange } from "@/lib/analytics/hours/sum-actual-labor-hours-in-range";
export { normalizeAddettoMappingKey } from "@/lib/analytics/hours/normalize-addetto-mapping-key";
export {
  buildAddettiEmployeeMappingIndex,
  resolveEmployeeIdFromMapping,
} from "@/lib/analytics/hours/resolve-employee-from-mapping";
