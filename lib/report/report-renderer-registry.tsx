"use client";

import type { ComponentType } from "react";
import { MetricCard } from "@/components/report/design-system/primitives/metric-card/metric-card";
import { ReportDataTable } from "@/components/report/design-system/primitives/data-table/data-table";
import { ReportBarChart } from "@/components/report/design-system/primitives/chart/chart";
import { ReportMetricMatrix } from "@/components/report/report-metric-matrix";
import type { ReportMetric, ReportMetricRegistryEntry } from "@/lib/report/metrics/report-metric-types";
import { reportMetricRendererAudit } from "@/lib/report/metrics/report-metric-renderer-audit";

export type ReportRendererProps = {
  metric: ReportMetric;
  definition: ReportMetricRegistryEntry;
  hero?: boolean;
  compact?: boolean;
};

function MetricCardRenderer({ metric, definition, hero, compact }: ReportRendererProps) {
  return <MetricCard metric={metric} definition={definition} hero={hero} compact={compact} />;
}

function DataTableRenderer({ metric }: ReportRendererProps) {
  const configId = metric.id;
  return <ReportDataTable configId={configId} rows={[]} />;
}

function ChartRenderer({ metric, definition }: ReportRendererProps) {
  const points =
    metric.payload?.kind === "temporal"
      ? metric.payload.data.points
      : [{ label: definition.label, value: metric.value }];
  return <ReportBarChart points={points} title={definition.label} />;
}

function MatrixRenderer({ metric, definition }: ReportRendererProps) {
  return <ReportMetricMatrix metric={metric} definition={definition} />;
}

export const REPORT_RENDERERS = {
  kpi: MetricCardRenderer,
  ranking: DataTableRenderer,
  temporal: ChartRenderer,
  matrix: MatrixRenderer,
} as const satisfies Record<string, ComponentType<ReportRendererProps>>;

export function renderReportMetric(metric: ReportMetric, definition: ReportMetricRegistryEntry, opts?: { hero?: boolean; compact?: boolean }) {
  const Renderer = REPORT_RENDERERS[definition.rendererKind];
  return <Renderer metric={metric} definition={definition} hero={opts?.hero} compact={opts?.compact} />;
}

/** Self-check: ogni rendererKind attivo ha handler. */
export function assertReportRenderersComplete(): void {
  const missing = reportMetricRendererAudit(REPORT_RENDERERS);
  if (missing.length > 0) {
    throw new Error(`REPORT_RENDERERS incomplete: ${missing.join(", ")}`);
  }
}
