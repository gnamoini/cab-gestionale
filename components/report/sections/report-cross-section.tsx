"use client";

import { useMemo } from "react";
import { CrossTrustBanner } from "@/components/report/sections/cross/cross-trust-banner";
import { CrossScatterChart } from "@/components/report/sections/cross/cross-scatter-chart";
import { useReportCrossAnalysis } from "@/components/report/hooks/use-report-cross-analysis";
import { useReportAnalyticsDerived } from "@/components/report/report-analytics-derived-context";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import {
  ReportBarChart,
  ReportDataTable,
  ReportMatrix,
  ReportMultiSeriesLineChart,
  ReportSection,
  ReportVisualization,
} from "@/components/report/design-system";
import { KPI_CHART_SERIES_COLORS } from "@/components/report/design-system/primitives/chart/multi-series-line-chart";
import {
  buildCrossMonthlyTrend,
  crossTrendIndexedSeries,
} from "@/lib/report/cross-analysis/build-cross-monthly-trend";
import {
  buildCrossCatenaValore,
  buildCrossClienteRedditivita,
  buildCrossOutlierTable,
  buildCrossPreventivoConsuntivo,
  buildCrossScatterPoints,
  buildCrossVolumeAnomaly,
} from "@/lib/report/cross-analysis/build-cross-breakdowns";
import { useReportTimesheetKpi } from "@/src/hooks/use-report-timesheet-kpi";
import { useInvoicesQuery } from "@/src/hooks/gestionale/use-invoices-query";
import { usePreventiviRecordsQuery } from "@/src/hooks/gestionale/use-preventivi-records-query";
import { reportContentPanelClass } from "@/components/report/report-ui-tokens";

function fmtEur(n: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export default function ReportCrossSectionView(props: DomainReportSectionProps) {
  const derived = useReportAnalyticsDerived();
  const compareRange = props.showCompare && props.compareRange ? props.compareRange : props.range;
  const timesheet = useReportTimesheetKpi(props.range);
  const invoicesQ = useInvoicesQuery(props.fetchEnabled);
  const preventiviQ = usePreventiviRecordsQuery(props.fetchEnabled);
  const apiCross = useReportCrossAnalysis(props.range, props.analyticsContext.compareMode);

  const monthlyTrend = useMemo(
    () =>
      buildCrossMonthlyTrend({
        range: props.range,
        completate: props.completate,
        manualByMonth: props.manualByMonth,
        magLog: props.magLog,
        magazzinoRows: props.magazzinoRows,
        timesheetEntries: timesheet.entries,
        schedeStore: props.schedeStore,
        costoOrario: props.costoOrario,
        invoices: invoicesQ.invoices,
      }),
    [
      props.range,
      props.completate,
      props.manualByMonth,
      props.magLog,
      props.magazzinoRows,
      timesheet.entries,
      props.schedeStore,
      props.costoOrario,
      invoicesQ.invoices,
    ],
  );

  const wh = derived.warehouse?.data;
  const lab = derived.labor?.data;
  const eco = derived.economic?.data;

  const marginPerHour = useMemo(() => {
    if (!eco || !lab || lab.totalHours <= 0) return null;
    const manodopera = lab.manodoperaCost ?? 0;
    const movement = wh?.movementValue ?? 0;
    const margine = eco.invoicesBilled - manodopera - movement;
    const perHour = Math.round((margine / lab.totalHours) * 100) / 100;
    return {
      value: fmtEur(perHour),
      sub: `Margine stimato ${fmtEur(margine)} su ${lab.totalHours} h`,
    };
  }, [eco, lab, wh]);

  const trendSeries = useMemo(() => {
    const indexed = crossTrendIndexedSeries(monthlyTrend);
    const toPoints = (key: keyof (typeof indexed)[0], id: string, label: string, color: string) => ({
      id,
      label,
      color,
      unit: "ratio" as const,
      points: indexed.map((p) => ({
        date: p.label,
        displayValue: p[key] as number,
        realValue: p[key] as number,
      })),
    });
    return [
      toPoints("efficiency", "eff", "Efficienza", KPI_CHART_SERIES_COLORS[0]!),
      toPoints("partsPerJob", "parts", "Ricambi/int", KPI_CHART_SERIES_COLORS[1]!),
      toPoints("costPerJob", "cost", "Costo medio", KPI_CHART_SERIES_COLORS[2]!),
      toPoints("valuePerHour", "value", "Valore/ora", KPI_CHART_SERIES_COLORS[3]!),
    ];
  }, [monthlyTrend]);

  const waterfallPoints = useMemo(() => {
    const ricambi = wh?.movementValue ?? 0;
    const manodopera = lab?.manodoperaCost ?? 0;
    if (ricambi <= 0 && manodopera <= 0) return [];
    return [
      { label: "Ricambi", value: ricambi },
      { label: "Manodopera", value: manodopera },
    ];
  }, [wh, lab]);

  const scatter = useMemo(
    () =>
      buildCrossScatterPoints({
        completate: props.completate,
        range: props.range,
        schedeStore: props.schedeStore,
        costoOrario: props.costoOrario,
        magazzinoRows: props.magazzinoRows,
      }),
    [props.completate, props.range, props.schedeStore, props.costoOrario, props.magazzinoRows],
  );

  const clienteMatrix = useMemo(
    () =>
      buildCrossClienteRedditivita({
        invoices: invoicesQ.invoices,
        completate: props.completate,
        range: props.range,
        schedeStore: props.schedeStore,
        costoOrario: props.costoOrario,
        magazzinoRows: props.magazzinoRows,
      }),
    [
      invoicesQ.invoices,
      props.completate,
      props.range,
      props.schedeStore,
      props.costoOrario,
      props.magazzinoRows,
    ],
  );

  const mezzoRows = useMemo(() => {
    const fromPerf = props.analyticsContext.perf?.economic?.topMezziByCost ?? [];
    return fromPerf.map((r) => ({ id: r.mezzoId, label: r.label, cost: r.cost }));
  }, [props.analyticsContext.perf]);

  const outliers = useMemo(() => buildCrossOutlierTable(scatter), [scatter]);

  const catenaValore = useMemo(
    () =>
      buildCrossCatenaValore({
        preventivi: preventiviQ.records,
        invoices: invoicesQ.invoices,
        completate: props.completate,
        range: props.range,
      }),
    [preventiviQ.records, invoicesQ.invoices, props.completate, props.range],
  );

  const preventivoConsuntivo = useMemo(
    () =>
      buildCrossPreventivoConsuntivo(
        preventiviQ.records,
        props.completate,
        props.range,
        props.schedeStore,
        props.costoOrario,
        props.magazzinoRows,
      ),
    [
      preventiviQ.records,
      props.completate,
      props.range,
      props.schedeStore,
      props.costoOrario,
      props.magazzinoRows,
    ],
  );

  const volumeAnomaly = useMemo(
    () => buildCrossVolumeAnomaly(props.semanticIndex.completateByMonth, props.range),
    [props.semanticIndex.completateByMonth, props.range],
  );

  const crossInsights = useMemo(() => {
    const items: { severity: "warning" | "info"; message: string }[] = [];
    if (marginPerHour && marginPerHour.value.includes("-")) {
      items.push({
        severity: "warning",
        message: "Margine per ora negativo: verificare costi vs fatturato nel periodo.",
      });
    }
    const anomalous = volumeAnomaly.filter((a) => a.anomalous);
    if (anomalous.length > 0) {
      items.push({
        severity: "info",
        message: `${anomalous.length} mese/i con volume chiusure anomalo rispetto alla media.`,
      });
    }
    if (preventivoConsuntivo.count > 0 && preventivoConsuntivo.avgDeltaPct != null) {
      const d = preventivoConsuntivo.avgDeltaPct;
      if (Math.abs(d) > 15) {
        items.push({
          severity: "warning",
          message: `Scostamento medio preventivo vs consuntivo: ${d > 0 ? "+" : ""}${d}% su ${preventivoConsuntivo.count} lavorazioni.`,
        });
      }
    }
    return items.slice(0, 3);
  }, [marginPerHour, volumeAnomaly, preventivoConsuntivo]);

  return (
    <div className="min-w-0 space-y-4">
      <CrossTrustBanner
        metrics={apiCross.metrics}
        dataWarnings={apiCross.dataWarnings}
        trustStatus={apiCross.trustStatus}
      />

      <ReportSection
        id="report-cross-kpi"
        title="KPI trasversali"
        subtitle="Migrati in Analisi avanzate → Indicatori incrociati"
      >
        <div className={reportContentPanelClass}>
          <p className="text-sm text-[color:var(--cab-text-muted)]">
            I quattro KPI incrociati (efficienza, ricambi/intervento, costo medio, valore/ora) sono disponibili nel BI
            Center — sezione Analisi avanzate.
          </p>
        </div>
      </ReportSection>

      <ReportSection
        id="report-cross-trend"
        title="Trend cross-domain"
        subtitle="Indice base 100 sul primo mese con dati"
        defaultCollapsed
      >
        <ReportVisualization title="Andamento mensile KPI trasversali">
          <ReportMultiSeriesLineChart series={trendSeries} displayMode="indexed" />
        </ReportVisualization>
        {waterfallPoints.length > 0 ? (
          <div className="mt-4">
            <ReportBarChart points={waterfallPoints} title="Composizione costo lavorazione" />
          </div>
        ) : null}
      </ReportSection>

      <ReportSection
        id="report-cross-analisi"
        title="Analisi incrociate"
        subtitle="Correlazioni, redditività e anomalie"
        defaultCollapsed
      >
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <ReportMatrix title="Cliente × redditività">
            <ReportDataTable
              configId="cross-cliente-redditivita"
              rows={clienteMatrix.map((r) => ({ ...r, id: r.cliente }))}
            />
          </ReportMatrix>
          <ReportMatrix title="Mezzo × costo manutenzione">
            <ReportDataTable configId="cross-mezzo-costo" rows={mezzoRows} />
          </ReportMatrix>
        </div>
        <div className="mt-4">
          <CrossScatterChart points={scatter} />
        </div>
        {catenaValore.some((s) => s.value > 0) ? (
          <div className="mt-4">
            <ReportBarChart
              points={catenaValore.map((s) => ({ label: s.stage, value: s.value }))}
              title="Catena valore (preventivo → incasso)"
            />
          </div>
        ) : null}
      </ReportSection>

      <ReportSection
        id="report-cross-dettaglio"
        title="Dettaglio operativo"
        subtitle="Interventi outlier e anomalie volume"
        defaultCollapsed
      >
        <ReportDataTable
          configId="cross-outlier"
          rows={outliers.map((r) => ({ ...r, id: r.id }))}
        />
        {volumeAnomaly.some((a) => a.anomalous) ? (
          <div className="mt-4">
            <ReportBarChart
              points={volumeAnomaly.map((a) => ({
                label: a.label,
                value: a.value,
                muted: !a.anomalous,
              }))}
              title="Chiusure mensili (evidenza anomalie)"
            />
          </div>
        ) : null}
      </ReportSection>

      {crossInsights.length > 0 ? (
        <ReportSection id="report-cross-insights" title="Insight automatici" subtitle="Soglie operative">
          <ul className="space-y-2">
            {crossInsights.map((item) => (
              <li
                key={item.message}
                className={`rounded-md border px-3 py-2 text-sm ${
                  item.severity === "warning"
                    ? "border-[color:var(--cab-warning-border)] bg-[color:var(--cab-warning-bg)]"
                    : "border-[color:var(--cab-border)] bg-[color:var(--cab-surface-muted)]"
                }`}
              >
                {item.message}
              </li>
            ))}
          </ul>
        </ReportSection>
      ) : null}
    </div>
  );
}
