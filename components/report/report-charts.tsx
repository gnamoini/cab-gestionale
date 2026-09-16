"use client";

import { memo } from "react";
import {
  ReportBklitCapitalLine,
  ReportBklitStackedEntrateUscite,
  ReportBklitTemporalMonthlyBars,
  ReportBklitYearlyForecast,
} from "@/components/report/bklit/report-bklit-charts";
import type { YearForecastLinePoint } from "@/lib/report/lavorazioni-year-matrix";

export function ReportYearlyForecastLineChartInner({
  solid,
  dashed,
  forecastYear,
  forecastYearEnd,
}: {
  solid: YearForecastLinePoint[];
  dashed: YearForecastLinePoint[];
  forecastYear: number;
  forecastYearEnd: number | null;
}) {
  return (
    <ReportBklitYearlyForecast
      solid={solid}
      dashed={dashed}
      forecastYear={forecastYear}
      forecastYearEnd={forecastYearEnd}
    />
  );
}

function MagazzinoEntrateUsciteStackedBarsInner({
  rows,
}: {
  rows: { label: string; entrate: number; uscite: number }[];
}) {
  return <ReportBklitStackedEntrateUscite rows={rows} mode="stacked" />;
}

function MagazzinoEntrateUsciteBarsInner({
  rows,
}: {
  rows: { label: string; entrate: number; uscite: number }[];
}) {
  return <ReportBklitStackedEntrateUscite rows={rows} mode="grouped" />;
}

function MagazzinoCapitalLineChartInner({ rows }: { rows: { label: string; capitaleFinale: number }[] }) {
  return <ReportBklitCapitalLine rows={rows} />;
}

function ReportTemporalMonthlyBarsInner({
  rows,
  ariaLabel = "Lavorazioni completate per mese",
}: {
  rows: { label: string; count: number; muted?: boolean }[];
  ariaLabel?: string;
  valueLabel?: string;
}) {
  return <ReportBklitTemporalMonthlyBars rows={rows} ariaLabel={ariaLabel} />;
}

export const ReportYearlyForecastLineChart = memo(ReportYearlyForecastLineChartInner);
export const MagazzinoEntrateUsciteStackedBars = memo(MagazzinoEntrateUsciteStackedBarsInner);
export const MagazzinoEntrateUsciteBars = memo(MagazzinoEntrateUsciteBarsInner);
export const MagazzinoCapitalLineChart = memo(MagazzinoCapitalLineChartInner);
export const ReportTemporalMonthlyBars = memo(ReportTemporalMonthlyBarsInner);
