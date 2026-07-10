"use client";

import { useMemo } from "react";
import { resolvePresetRange, type DateRange, type ReportPeriodPreset } from "@/lib/report/date-ranges";
import { buildKpiSeries } from "@/lib/report/kpi-series/build-kpi-series";
import { validateChartSelection } from "@/lib/report/kpi-series/capability-matrix";
import { suggestBucketForRange } from "@/lib/report/kpi-series/bucket";
import {
  DEFAULT_NORMALIZATION,
  normalizeSeries,
  resolveDisplayMode,
  type NormalizationConfig,
} from "@/lib/report/kpi-series/normalize";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import type { KpiChartDisplayMode } from "@/lib/report/metrics/report-metric-types";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import type { DipendenteTimesheetEntryRow } from "@/lib/dipendenti/types";
import type { InvoiceRow } from "@/src/types/supabase-tables";

export type KpiChartDraftConfig = {
  metricIds: string[];
  preset: ReportPeriodPreset;
  customFrom: string;
  customTo: string;
  displayMode: "indexed" | "absolute";
  normalization: NormalizationConfig;
  absoluteConfirmed: boolean;
};

export const DEFAULT_KPI_CHART_DRAFT: KpiChartDraftConfig = {
  metricIds: [],
  preset: "last_30_days",
  customFrom: "",
  customTo: "",
  displayMode: "indexed",
  normalization: DEFAULT_NORMALIZATION,
  absoluteConfirmed: false,
};

export type UseKpiChartSeriesInput = {
  draft: KpiChartDraftConfig;
  anchor: Date;
  props: DomainReportSectionProps;
  invoices?: readonly InvoiceRow[];
  timesheetEntries?: readonly DipendenteTimesheetEntryRow[];
  enabled: boolean;
};

export function useKpiChartSeries({
  draft,
  anchor,
  props,
  invoices,
  timesheetEntries,
  enabled,
}: UseKpiChartSeriesInput) {
  const range: DateRange = useMemo(
    () => resolvePresetRange(anchor, draft.preset, draft.customFrom, draft.customTo),
    [anchor, draft.preset, draft.customFrom, draft.customTo],
  );

  const bucket = useMemo(() => suggestBucketForRange(range), [range]);

  const units = useMemo(
    () =>
      draft.metricIds.map((id) => getRegistryEntry(id)?.unit ?? "count"),
    [draft.metricIds],
  );

  const resolvedDisplayMode: KpiChartDisplayMode = useMemo(() => {
    if (draft.displayMode === "absolute" && !draft.absoluteConfirmed) return "indexed";
    return resolveDisplayMode(draft.displayMode, draft.metricIds, units);
  }, [draft.displayMode, draft.absoluteConfirmed, draft.metricIds, units]);

  const validation = useMemo(
    () => validateChartSelection(draft.metricIds, bucket, resolvedDisplayMode),
    [draft.metricIds, bucket, resolvedDisplayMode],
  );

  const bundle = useMemo(() => {
    if (!enabled || !validation.ok || draft.metricIds.length < 2) return null;
    return buildKpiSeries({
      metricIds: draft.metricIds,
      range,
      context: {
        attive: props.attive,
        storico: props.storico,
        completate: props.completate,
        manualByMonth: props.manualByMonth,
        magLog: props.magLog,
        prodotti: props.prodotti,
        invoices,
        timesheetEntries,
        schedeStore: props.schedeStore,
        magazzinoRows: props.magazzinoRows,
        costoOrario: props.costoOrario,
      },
    });
  }, [
    enabled,
    validation.ok,
    draft.metricIds,
    range,
    props,
    invoices,
    timesheetEntries,
  ]);

  const normalized = useMemo(() => {
    if (!bundle) return [];
    const normConfig: NormalizationConfig = {
      ...draft.normalization,
      mode: resolvedDisplayMode === "indexed" ? "indexed" : "absolute",
    };
    return bundle.series.map((s) => normalizeSeries(s, normConfig));
  }, [bundle, draft.normalization, resolvedDisplayMode]);

  const readyCount = normalized.filter((s) => s.status === "ready").length;
  const status: "idle" | "invalid" | "empty" | "ready" | "partial" =
    !enabled || draft.metricIds.length < 2
      ? "idle"
      : !validation.ok
        ? "invalid"
        : readyCount === 0
          ? "empty"
          : readyCount < draft.metricIds.length
            ? "partial"
            : "ready";

  return {
    range,
    bucket: bundle?.bucket ?? bucket,
    bucketDowngraded: bundle?.bucketDowngraded,
    validation,
    resolvedDisplayMode,
    normalized,
    status,
  };
}
