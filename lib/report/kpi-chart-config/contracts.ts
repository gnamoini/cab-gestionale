import type { ReportPeriodPreset } from "@/lib/report/date-ranges";
import type { NormalizationConfig } from "@/lib/report/kpi-series/normalize";

export const KPI_CHART_CONFIG_SCHEMA_VERSION = 1 as const;

/** Body JSON persistito in colonna `config`. */
export type KpiChartConfigBody = {
  metricIds: string[];
  preset: ReportPeriodPreset;
  customFrom: string;
  customTo: string;
  displayMode: "indexed" | "absolute";
  normalization: NormalizationConfig;
};

/** Modello dominio per UI (row + config flat). */
export type SavedKpiChart = {
  id: string;
  name: string;
  metricIds: string[];
  preset: ReportPeriodPreset;
  customFrom: string;
  customTo: string;
  displayMode: "indexed" | "absolute";
  normalization: NormalizationConfig;
  schemaVersion: number;
  updatedAt: string;
  createdAt: string;
};

export type ReportSavedKpiChartRow = {
  id: string;
  user_id: string;
  name: string;
  config: KpiChartConfigBody;
  schema_version: number;
  created_at: string;
  updated_at: string;
};

export type CreateSavedKpiChartInput = {
  id?: string;
  name: string;
  config: KpiChartConfigBody;
};

export type UpdateSavedKpiChartInput = {
  id: string;
  name?: string;
  config?: KpiChartConfigBody;
};

/** @deprecated Usare SavedKpiChart — alias per transizione UI. */
export type SavedKpiChartConfig = SavedKpiChart;
