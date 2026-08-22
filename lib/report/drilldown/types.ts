import type { ListCursor } from "@/lib/domain/list-types";
import type { Page } from "@/lib/domain/list-types";
import type {
  ReportCompareMode,
  ReportRequestedPeriod,
} from "@/lib/report/contracts/metadata-envelope";
import type { ReportDimensionId } from "@/lib/report/metrics/report-metric-types";
import type { ReportMetricEnvelopeTrust } from "@/lib/report/metrics/report-metric-envelope";

export type ReportDrillDownAggregationKind =
  | "count"
  | "sum"
  | "snapshot"
  | "ranking"
  | "composite";

export type ReportDrillDownKind = "record_list" | "composition_analysis";

export type ReportDrillDownSource =
  | "kpi"
  | "chart"
  | "insight"
  | "breakdown"
  | "timeline";

export type ReportDrillDownRecordEntity =
  | "lavorazione"
  | "fattura"
  | "preventivo"
  | "ricambio"
  | "movimento"
  | "cliente"
  | "ddt"
  | "ordine_fornitore";

export type ReportDrillDownRecordTarget = {
  entity: ReportDrillDownRecordEntity;
  id: string;
};

export type ReportDrillDownRow = {
  id: string;
  target: ReportDrillDownRecordTarget;
  label: string;
  sublabel?: string;
  amount?: number | null;
  date?: string | null;
  status?: string | null;
};

export type ReportDrillDownCompositionComponent = {
  id: string;
  label: string;
  value: number;
  formulaId: string;
  trust: ReportMetricEnvelopeTrust;
  source: string;
};

export type ReportDrillDownRequest = {
  metricId: string;
  period: ReportRequestedPeriod;
  compareMode?: ReportCompareMode;
  dimension?: ReportDimensionId;
  dimensionValue?: string;
  filters?: Record<string, string | number | boolean>;
  cursor?: ListCursor | null;
  pageSize?: number;
};

export type ReportDrillDownHeader = {
  title: string;
  periodLabel: string;
  recordCount: number | null;
  metricValueLabel: string | null;
  compareLabel: string | null;
  trust: ReportMetricEnvelopeTrust;
  aggregationKind: ReportDrillDownAggregationKind;
  drillDownKind: ReportDrillDownKind;
  parityApplicable: boolean;
  parityNote?: string;
};

export type ReportDrillDownResponse = {
  header: ReportDrillDownHeader;
  drillDownKind: ReportDrillDownKind;
  page?: Page<ReportDrillDownRow>;
  composition?: ReportDrillDownCompositionComponent[];
};

export type ReportDrillDownContext = {
  metricId: string;
  period: ReportRequestedPeriod;
  compareMode?: ReportCompareMode;
  dimension?: ReportDimensionId;
  dimensionValue?: string;
  filters?: Record<string, string | number | boolean>;
  source?: ReportDrillDownSource;
  anchor?: string;
};

export const DEFAULT_DRILLDOWN_PAGE_SIZE = 25;
