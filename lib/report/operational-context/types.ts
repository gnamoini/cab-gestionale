import type { ReportDrillDownContext } from "@/lib/report/drilldown/types";

export type ReportOperationalEventType =
  | "insight"
  | "diary"
  | "work_order"
  | "inventory"
  | "commercial"
  | "economic"
  | "system";

export type ReportOperationalEventSeverity = "positive" | "negative" | "attention" | "neutral";

export type ReportOperationalEventEntityType =
  | "lavorazione"
  | "cliente"
  | "ricambio"
  | "fattura"
  | "preventivo"
  | "mezzo";

export type ReportOperationalEvent = {
  id: string;
  timestamp: string;
  type: ReportOperationalEventType;
  title: string;
  summary?: string;
  severity?: ReportOperationalEventSeverity;
  metricIds?: string[];
  insightRuleKeys?: string[];
  entity?: {
    type: ReportOperationalEventEntityType;
    id: string;
    label?: string;
  };
  source: {
    kind: "deterministic" | "diary" | "system";
    sourceId?: string;
  };
  drillDown?: ReportDrillDownContext;
  filterCategory?: OperationalTimelineFilter;
};

export type OperationalTimelineFilter =
  | "all"
  | "operational"
  | "economic"
  | "warehouse"
  | "commercial"
  | "notes"
  | "insight";

export type ReportOperationalCorrelationAssociation =
  | "correlato"
  | "temporalmente_associato"
  | "possibile_fattore"
  | "evento_coincidente";

export type ReportOperationalCorrelation = {
  id: string;
  label: string;
  association: ReportOperationalCorrelationAssociation;
  metricIds: string[];
  eventIds?: string[];
  insightRuleKeys?: string[];
};

export type ReportOperationalContext = {
  summaryEvents: ReportOperationalEvent[];
  timelineEvents: ReportOperationalEvent[];
  correlations: ReportOperationalCorrelation[];
  pagination?: { cursor: string | null; hasMore: boolean };
  generatedAt: string;
};
