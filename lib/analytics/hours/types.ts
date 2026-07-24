export type HourKind = "presence" | "actual" | "estimated";

export type HoursConfidence = "high" | "warning" | "low";

export type HoursConsistency = "ok" | "mismatch" | "missing" | "unmapped";

export type AnalyticsHoursResult = {
  hours: number;
  kind: HourKind;
  source: string;
  confidence: HoursConfidence;
  consistency: HoursConsistency;
  anomalies?: string[];
};

export type MetricHourDefinition = {
  id: string;
  hourKind?: HourKind;
  sourceTables: string[];
  allowEstimate: boolean;
};

export type HoursIntegrityIssue = {
  lavorazioneId: string;
  status: HoursConsistency | "warning";
  message: string;
};

export type HoursIntegritySummary = {
  totalRecords: number;
  okCount: number;
  warningCount: number;
  mismatchCount: number;
  missingCount: number;
  unmappedCount: number;
  validatedPct: number;
  issues: HoursIntegrityIssue[];
};

export type EmployeeUtilizationRow = {
  employeeId: string;
  employeeName: string;
  presenceHours: number;
  actualLaborHours: number;
  utilizationPct: number | null;
  completedJobs: number;
};

export type EmployeeUtilizationResult = {
  rows: EmployeeUtilizationRow[];
  unmappedHours: number;
  unmappedAddetti: string[];
};

export type EstimateVsActualRow = {
  lavorazioneId: string;
  preventivoId: string;
  estimatedHours: number;
  actualHours: number;
  deltaHours: number;
  deltaPct: number | null;
};

export type EstimateVsActualResult = {
  rows: EstimateVsActualRow[];
  totalEstimated: number;
  totalActual: number;
};
