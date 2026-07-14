import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import type { DateRange } from "@/lib/report/date-ranges";

export type HealthScoreStatus = "READY" | "CALCULATING" | "STALE" | "FAILED";

export type WorkshopSize = "micro" | "piccola" | "media" | "grande" | "enterprise";

export type HealthScoreTone = "excellent" | "good" | "warn" | "critical" | "neutral";

export type ConfidenceLevel = "high" | "medium" | "low";

export type DataQualityLevel = "high" | "medium" | "low";

/** Aggregati compatti per calcolo e audit — no raw rows. */
export type InputSnapshot = {
  closed: number;
  closedPrev: number;
  opened: number;
  openedPrev: number;
  backlog: number;
  backlogAvgAgeDays: number;
  avgCloseDays: number;
  avgCloseDaysPrev: number;
  urgentFulfillmentDays: number;
  urgentFulfillmentDaysPrev: number | null;
  urgentSampleSize: number;
  slaLatePct: number;
  stockCritical: number;
  stockCriticalMaxDays: number;
  magMovements: number;
  magMovementsPrev: number;
  magEntrate: number;
  magEntratePrev: number;
  magConsumi: number;
  magConsumiPrev: number;
  hoursWorked: number;
  hoursWorkedPrev: number;
  overtimePct: number;
  overtimePctPrev: number;
  absenceHours: number;
  absenceHoursPrev: number;
  dipendentiAttivi: number;
  timesheetCoveragePct: number;
  preventiviEmessi: number;
  preventiviEmessiPrev: number;
  fatturato: number;
  fatturatoPrev: number;
  incassato: number;
  incassatoPrev: number;
  inactiveLavorazioniCount: number;
  inactiveWeightedExcessDays: number;
  lateIngressCount: number;
  openCount: number;
  mezziCount: number;
  dataQualityFlags: string[];
};

export type FormulaTraceStep = {
  step: string;
  formula: string;
  input: Record<string, number | string | boolean>;
  output: number;
};

export type KpiExplainNode = {
  id: string;
  label: string;
  sectionId: string;
  current: number;
  previous: number | null;
  target: number | null;
  trendPct: number | null;
  trendScore: number;
  levelScore: number;
  kpiScore: number;
  staticWeight: number;
  dynamicWeight: number;
  confidence: ConfidenceLevel;
  confidenceMultiplier: number;
  dataQuality: DataQualityLevel;
  dataQualityMultiplier: number;
  dependencyFactor: number;
  effectiveWeight: number;
  contributionPoints: number;
  motivation: string;
  trace: FormulaTraceStep[];
  recommendedActions?: string[];
  redacted?: boolean;
};

export type SectionExplainNode = {
  id: string;
  label: string;
  weight: number;
  sectionScore: number;
  contributionPoints: number;
  kpis: KpiExplainNode[];
  redacted?: boolean;
};

export type RiskModifierExplainNode = {
  id: string;
  label: string;
  penalty: number;
  motivation: string;
  trace: FormulaTraceStep[];
};

export type HealthScoreBreakdown = {
  sections: SectionExplainNode[];
  riskModifiers: RiskModifierExplainNode[];
  redactedContributionPoints: number;
  redactedSummary?: string;
};

export type HealthScoreResult = {
  status: HealthScoreStatus;
  score: number;
  scoreRaw: number;
  label: string;
  tone: HealthScoreTone;
  periodLabel: string;
  workshopSize: WorkshopSize;
  confidenceOverall: number;
  dataQualityOverall: number;
  breakdown: HealthScoreBreakdown;
  engineVersion: string;
  configVersion: string;
  schemaVersion: string;
  computedAt: string;
  period: DateRange;
  prevPeriod: DateRange;
  cacheHit: boolean;
};

export type ModuleAccessMap = Partial<
  Record<GestionalePermissionModule, { canRead: boolean; canWrite: boolean }>
>;

export type KpiRawValue = {
  current: number;
  previous: number | null;
  sampleSize: number;
  unit?: "count" | "hours" | "days" | "currency" | "percent";
};

export type KpiContext = {
  snapshot: InputSnapshot;
  workshopSize: WorkshopSize;
  config: import("@/lib/health-score/config/schema").HealthScoreConfig;
  anchor: Date;
  range: DateRange;
  prevRange: DateRange;
  kpiResults: Map<string, { kpiScore: number; effectiveWeight: number }>;
};
