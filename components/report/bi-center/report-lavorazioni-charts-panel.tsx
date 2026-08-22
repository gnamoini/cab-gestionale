"use client";

import { useMemo } from "react";
import { useReportPeriodContext } from "@/components/report/context/report-period-context";
import { useReportDomainSnapshot } from "@/components/report/context/report-domain-snapshot-context";
import {
  useRegisterAnalyticsSection,
  useReportAnalyticsContext,
} from "@/components/report/analytics/report-analytics-provider";
import { ReportIngressiChiusureChart } from "@/components/report/primitives/chart/ingressi-chiusure-chart";
import { buildIngressiChiusureMonthlyPoints } from "@/lib/report/lavorazioni-work-orders";
import type { ReportMetricSeries } from "@/lib/report/analytics-engine/types";

function ingressiChiusureFromEngineSeries(
  ingressi: ReportMetricSeries | undefined,
  chiusure: ReportMetricSeries | undefined,
) {
  if (!ingressi?.points.length || !chiusure?.points.length) return null;
  const chiusureByPeriod = new Map(chiusure.points.map((p) => [p.periodStart, p.value ?? 0]));
  let cumul = 0;
  return ingressi.points.map((p) => {
    const ingressiVal = p.value ?? 0;
    const chiusureVal = chiusureByPeriod.get(p.periodStart) ?? 0;
    cumul += ingressiVal - chiusureVal;
    return {
      label: p.periodStart,
      monthKey: p.periodStart,
      ingressi: ingressiVal,
      chiusure: chiusureVal,
      saldoCumulativo: cumul,
    };
  });
}

/** Lavorazioni advanced chart — ingressi vs chiusure via engine series with builder fallback. */
export function ReportLavorazioniChartsPanel() {
  const { range } = useReportPeriodContext();
  const { attive, storico, completate, manualByMonth } = useReportDomainSnapshot();

  useRegisterAnalyticsSection("bi-lavorazioni-charts", "lavorazioni", {
    metricIds: ["lav-periodo", "lav-chiusi"],
    includeSeries: true,
    granularity: "month",
  });

  const { result, isLoading } = useReportAnalyticsContext();

  const builderPoints = useMemo(
    () => buildIngressiChiusureMonthlyPoints(attive, storico, completate, range, manualByMonth),
    [attive, storico, completate, range, manualByMonth],
  );

  const enginePoints = useMemo(() => {
    const ingressi = result?.series.find((s) => s.metricId === "lav-periodo");
    const chiusure = result?.series.find((s) => s.metricId === "lav-chiusi");
    return ingressiChiusureFromEngineSeries(ingressi, chiusure);
  }, [result?.series]);

  const points = enginePoints ?? builderPoints;

  if (isLoading && points.length === 0) {
    return <div className="h-48 animate-pulse rounded-lg bg-[color:var(--cab-surface-muted)]" />;
  }

  return (
    <div className="mt-4 min-w-0" data-testid="report-lavorazioni-charts-panel">
      <ReportIngressiChiusureChart points={points} />
    </div>
  );
}
