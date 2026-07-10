"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth, useAuthUserId } from "@/context/auth-context";
import { KpiChartConfigPanel } from "@/components/report/kpi-charts/kpi-chart-config-panel";
import { KpiChartSavedList } from "@/components/report/kpi-charts/kpi-chart-saved-list";
import {
  buildMultiSeriesChartProps,
  kpiChartStatusMessage,
} from "@/components/report/kpi-charts/kpi-chart-series-props";
import {
  DEFAULT_KPI_CHART_DRAFT,
  useKpiChartSeries,
  type KpiChartDraftConfig,
} from "@/components/report/kpi-charts/use-kpi-chart-series";
import { ReportMultiSeriesLineChart, ReportSection, ReportVisualization } from "@/components/report/design-system";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import { erpBtnNeutral } from "@/components/report/report-buttons";
import type { SavedKpiChart } from "@/lib/report/kpi-chart-config/contracts";
import { resolvePresetRange, ymdFromDate } from "@/lib/report/date-ranges";
import { reportKpiChartOpened, reportKpiChartSaved } from "@/lib/report/report-kpi-chart-telemetry";
import {
  useCreateSavedKpiChartMutation,
  useDeleteSavedKpiChartMutation,
  useMigrateLocalKpiCharts,
  useSavedKpiChartsQuery,
  useUpdateSavedKpiChartMutation,
} from "@/src/hooks/gestionale/use-saved-kpi-charts";
import { useInvoicesQuery } from "@/src/hooks/gestionale/use-invoices-query";
import { useReportTimesheetKpi } from "@/src/hooks/use-report-timesheet-kpi";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

function draftFromSaved(saved: SavedKpiChart): KpiChartDraftConfig {
  return {
    metricIds: [...saved.metricIds],
    preset: saved.preset,
    customFrom: saved.customFrom,
    customTo: saved.customTo,
    displayMode: saved.displayMode,
    normalization: saved.normalization,
    absoluteConfirmed: saved.displayMode === "absolute",
  };
}

export default function ReportKpiChartsSectionView(props: DomainReportSectionProps) {
  const userId = useAuthUserId();
  const { status: authStatus } = useAuth();
  const gestToast = useGestionaleToast();
  const [draft, setDraft] = useState<KpiChartDraftConfig>(DEFAULT_KPI_CHART_DRAFT);
  const [rangeInitialized, setRangeInitialized] = useState(false);
  const [applied, setApplied] = useState<KpiChartDraftConfig | null>(null);
  const [activeSavedId, setActiveSavedId] = useState<string | null>(null);
  const [saveName, setSaveName] = useState("");

  const savedQuery = useSavedKpiChartsQuery(userId, authStatus);
  const createMutation = useCreateSavedKpiChartMutation(userId);
  const updateMutation = useUpdateSavedKpiChartMutation(userId);
  const deleteMutation = useDeleteSavedKpiChartMutation(userId);
  const savedConfigs = savedQuery.data ?? [];

  useMigrateLocalKpiCharts(userId, savedQuery.data);

  const needsInvoices = draft.metricIds.some((id) => id === "eco_invoices" || id === "cost-tot");
  const needsTimesheet = draft.metricIds.includes("ore_total");

  const invoicesQ = useInvoicesQuery(props.fetchEnabled && needsInvoices);
  const timesheetQ = useReportTimesheetKpi(
    applied
      ? resolvePresetRange(props.anchor, applied.preset, applied.customFrom, applied.customTo)
      : props.range,
  );

  useEffect(() => {
    if (rangeInitialized) return;
    setDraft((prev) => ({
      ...prev,
      preset: "custom",
      customFrom: ymdFromDate(props.range.start),
      customTo: ymdFromDate(props.range.end),
    }));
    setRangeInitialized(true);
  }, [rangeInitialized, props.range]);

  const activeDraft = applied ?? draft;
  const chart = useKpiChartSeries({
    draft: activeDraft,
    anchor: props.anchor,
    props,
    invoices: invoicesQ.invoices,
    timesheetEntries: needsTimesheet || applied?.metricIds.includes("ore_total") ? timesheetQ.entries : undefined,
    enabled: applied != null && props.fetchEnabled,
  });

  const needsAbsoluteConfirm =
    draft.displayMode === "absolute" && !draft.absoluteConfirmed && chart.validation.ok;

  const handleApply = useCallback(() => {
    setApplied({ ...draft });
    reportKpiChartOpened({
      metricIds: draft.metricIds,
      timeframe: draft.preset,
      displayMode: chart.resolvedDisplayMode,
      bucket: chart.bucket,
    });
  }, [draft, chart.resolvedDisplayMode, chart.bucket]);

  const handleSave = useCallback(() => {
    const source = applied ?? draft;
    const name = saveName.trim() || `Grafico ${savedConfigs.length + 1}`;
    const existingId = activeSavedId && savedConfigs.some((c) => c.id === activeSavedId) ? activeSavedId : null;

    if (existingId) {
      updateMutation.mutate(
        { id: existingId, name, chart: source },
        {
          onSuccess: (chart) => {
            if (!chart) return;
            setActiveSavedId(chart.id);
            setSaveName("");
            reportKpiChartSaved({ configId: chart.id, metricCount: chart.metricIds.length });
          },
          onError: (e) => gestToast.error(e.message),
        },
      );
      return;
    }

    createMutation.mutate(
      { name, config: { metricIds: source.metricIds, preset: source.preset, customFrom: source.customFrom, customTo: source.customTo, displayMode: source.displayMode, normalization: source.normalization } },
      {
        onSuccess: (chart) => {
          if (!chart) return;
          setActiveSavedId(chart.id);
          setSaveName("");
          reportKpiChartSaved({ configId: chart.id, metricCount: chart.metricIds.length });
        },
        onError: (e) => gestToast.error(e.message),
      },
    );
  }, [applied, draft, saveName, savedConfigs, activeSavedId, updateMutation, createMutation, gestToast]);

  const handleLoad = useCallback((cfg: SavedKpiChart) => {
    const nextDraft = draftFromSaved(cfg);
    setDraft(nextDraft);
    setApplied(nextDraft);
    setActiveSavedId(cfg.id);
  }, []);

  const handleDelete = useCallback(
    (configId: string) => {
      deleteMutation.mutate(configId, {
        onSuccess: () => {
          if (activeSavedId === configId) setActiveSavedId(null);
        },
        onError: (e) => gestToast.error(e.message),
      });
    },
    [deleteMutation, activeSavedId, gestToast],
  );

  const loading = (needsInvoices && invoicesQ.isLoading) || (needsTimesheet && timesheetQ.isLoading);
  const saving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const statusMessage = kpiChartStatusMessage(chart.status);
  const chartSeries = buildMultiSeriesChartProps(chart.normalized, chart.resolvedDisplayMode);

  return (
    <div className="min-w-0 space-y-4">
      <ReportSection id="report-kpi-chart-config" title="Configurazione" subtitle="Combina KPI e periodo del grafico">
        <KpiChartConfigPanel
          draft={draft}
          onChange={setDraft}
          onApply={handleApply}
          validationErrors={chart.validation.errors}
          needsAbsoluteConfirm={needsAbsoluteConfirm}
          onConfirmAbsolute={() => {
            const next = { ...draft, absoluteConfirmed: true };
            setDraft(next);
            setApplied(next);
          }}
        />
      </ReportSection>

      <ReportSection id="report-kpi-chart-view" title="Grafico" subtitle="Confronto trend nel periodo">
        {loading ? (
          <p className="text-sm text-[color:var(--cab-text-muted)]">Caricamento dati…</p>
        ) : statusMessage ? (
          <p className="text-sm text-[color:var(--cab-text-muted)]">{statusMessage}</p>
        ) : (
          <div className="min-w-0 space-y-2">
            {chart.bucketDowngraded ? (
              <p className="text-xs text-[color:var(--cab-text-muted)]">
                Granularità ridotta automaticamente per limiti di performance.
              </p>
            ) : null}
            {chart.status === "partial" ? (
              <p className="text-xs text-[color:var(--cab-text-muted)]">
                Alcune serie non hanno dati disponibili nel periodo.
              </p>
            ) : null}
            <ReportVisualization title="Andamento KPI">
              <ReportMultiSeriesLineChart series={chartSeries} displayMode={chart.resolvedDisplayMode} />
            </ReportVisualization>
          </div>
        )}
      </ReportSection>

      <ReportSection
        id="report-kpi-chart-saved"
        title="Grafici salvati"
        subtitle="Configurazioni sincronizzate sul tuo account"
        defaultCollapsed
      >
        {savedQuery.isLoading ? (
          <p className="text-sm text-[color:var(--cab-text-muted)]">Caricamento grafici salvati…</p>
        ) : savedQuery.isError ? (
          <p className="text-sm text-[color:var(--cab-danger)]">
            Impossibile caricare i grafici salvati.{" "}
            <button type="button" className="underline" onClick={() => void savedQuery.refetch()}>
              Riprova
            </button>
          </p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-end gap-2">
              <label className="text-sm text-[color:var(--cab-text-muted)]">
                Nome
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Es. Chiusure vs fatturato"
                  className="ml-2 min-w-[12rem] rounded border border-[color:var(--cab-border)] bg-transparent px-2 py-1 text-sm"
                />
              </label>
              <button
                type="button"
                className={erpBtnNeutral}
                disabled={!applied || applied.metricIds.length < 2 || saving}
                onClick={handleSave}
              >
                Salva configurazione
              </button>
            </div>
            <KpiChartSavedList
              configs={savedConfigs}
              activeId={activeSavedId}
              onLoad={handleLoad}
              onDelete={handleDelete}
            />
          </>
        )}
      </ReportSection>
    </div>
  );
}
