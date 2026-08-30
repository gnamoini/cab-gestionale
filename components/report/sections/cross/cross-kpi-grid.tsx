"use client";

import { ReportKpiCard } from "@/components/report/report-kpi-card";
import {
  resolveInsightDrillDownElementId,
} from "@/components/report/insight-strip/insight-drill-down-nav";
import { CROSS_METRIC_UI, crossTrustToKpiTrust } from "@/lib/report/cross-analysis/cross-metric-ui-meta";
import type { CrossP0MetricId } from "@/lib/report/cross-analysis/cross-metric-registry";
import { crossMetricSparkline } from "@/lib/report/cross-analysis/build-cross-monthly-trend";
import type { CrossMonthlyPoint } from "@/lib/report/cross-analysis/build-cross-monthly-trend";
import type { CrossMetricDto } from "@/lib/report/cross-analysis/types";
import type { KpiCompareRow } from "@/lib/report/build-report-model";
import type { ReportDomainMetric } from "@/lib/report/report-domain-types";
import { useReportDensity } from "@/components/report/design-system/internal/use-report-density";

export type CrossKpiCardModel = {
  id: string;
  label: string;
  value: string;
  description: string;
  sub?: string;
  compareRows: KpiCompareRow[] | null;
  spark?: number[];
  trust?: ReturnType<typeof crossTrustToKpiTrust>;
  drillDown: (typeof CROSS_METRIC_UI)[CrossP0MetricId]["drillDown"];
  placeholder: boolean;
};

function compareRowsFromDomain(metric: ReportDomainMetric, invert: boolean): KpiCompareRow[] | null {
  const st = metric.state;
  if (st.status !== "available" || !st.compare) return null;
  const delta = st.compare.deltaPct;
  const adjustedDelta = invert && delta != null ? -delta : delta;
  const deltaAbs =
    adjustedDelta != null
      ? `${adjustedDelta > 0 ? "+" : ""}${adjustedDelta.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`
      : null;
  return [
    {
      label: st.compare.label,
      deltaAbs,
      deltaPct: adjustedDelta,
      invert,
    },
  ];
}

export function buildCrossKpiCardModels(input: {
  domainMetrics: readonly ReportDomainMetric[];
  apiMetrics: readonly CrossMetricDto[] | null;
  monthlyTrend: readonly CrossMonthlyPoint[];
  costCompositionSub?: string;
  marginPerHour?: { value: string; sub: string } | null;
  backlogPressure?: { value: string; sub: string } | null;
}): CrossKpiCardModel[] {
  const cards: CrossKpiCardModel[] = [];

  for (const metricId of Object.keys(CROSS_METRIC_UI) as CrossP0MetricId[]) {
    const ui = CROSS_METRIC_UI[metricId];
    const domain = input.domainMetrics.find((m) => m.id === metricId);
    const api = input.apiMetrics?.find((m) => m.metricId === metricId);

    if (!domain || domain.state.status === "not_loaded") {
      cards.push({
        id: metricId,
        label: ui.label,
        value: "N/D",
        description: ui.description,
        sub: "Caricamento dati cross-domain…",
        compareRows: null,
        trust: crossTrustToKpiTrust(api?.trust),
        drillDown: ui.drillDown,
        placeholder: true,
      });
      continue;
    }

    if (domain.state.status !== "available") {
      const reason =
        domain.state.status === "not_available"
          ? domain.state.reason
          : domain.state.status === "error"
            ? domain.state.message
            : "Non disponibile";
      cards.push({
        id: metricId,
        label: ui.label,
        value: "N/D",
        description: ui.description,
        sub: reason,
        compareRows: null,
        trust: crossTrustToKpiTrust(api?.trust),
        drillDown: ui.drillDown,
        placeholder: domain.state.status !== "error",
      });
      continue;
    }

    let sub: string | undefined;
    if (metricId === "cross_cost_job" && input.costCompositionSub) {
      sub = input.costCompositionSub;
    }

    cards.push({
      id: metricId,
      label: ui.label,
      value: domain.state.value,
      description: ui.description,
      sub,
      compareRows: compareRowsFromDomain(domain, ui.invertCompare === true),
      spark: crossMetricSparkline(input.monthlyTrend, metricId),
      trust: crossTrustToKpiTrust(api?.trust ?? "GREEN"),
      drillDown: ui.drillDown,
      placeholder: false,
    });
  }

  if (input.marginPerHour) {
    cards.push({
      id: "cross_margin_hour",
      label: "Margine per ora",
      value: input.marginPerHour.value,
      description: "Margine operativo stimato diviso ore lavorate.",
      sub: input.marginPerHour.sub,
      compareRows: null,
      drillDown: { metricId: "eco_margine_operativo_stimato", targetSection: "dati_economici" },
      placeholder: false,
    });
  }

  if (input.backlogPressure) {
    cards.push({
      id: "cross_backlog_pressure",
      label: "Pressione operativa",
      value: input.backlogPressure.value,
      description: "Rapporto tra interventi aperti e chiusure nel periodo.",
      sub: input.backlogPressure.sub,
      compareRows: null,
      drillDown: { metricId: "lav-aperti", targetSection: "lavorazioni", targetTab: "backlog" },
      placeholder: false,
    });
  }

  return cards;
}

function scrollToDrillDown(drillDown: CrossKpiCardModel["drillDown"]) {
  const el = document.getElementById(resolveInsightDrillDownElementId(drillDown));
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function CrossKpiGrid({ cards }: { cards: readonly CrossKpiCardModel[] }) {
  const { metricGridCols } = useReportDensity();
  return (
    <div className={`grid min-w-0 gap-3 ${metricGridCols}`}>
      {cards.map((card) => (
        <button
          key={card.id}
          type="button"
          className="min-w-0 cursor-pointer text-left rounded-[var(--ds-radius-lg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--cab-accent)]"
          onClick={() => scrollToDrillDown(card.drillDown)}
        >
          <ReportKpiCard
            label={card.label}
            value={card.value}
            description={card.description}
            sub={card.sub}
            compareRows={card.compareRows}
            spark={card.spark}
            trust={card.trust}
            placeholder={card.placeholder}
          />
        </button>
      ))}
    </div>
  );
}
