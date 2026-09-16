"use client";

import {
  ReportBklitBarPoints,
  ReportBklitCapitalLine,
  ReportBklitYearlyForecast,
} from "@/components/report/bklit/report-bklit-charts";
import { ReportVisualization } from "@/components/report/design-system/layout/visualization";
import type { ReportValueFormatter } from "@/lib/report/metrics/report-value-formatter";
import type { YearForecastLinePoint } from "@/lib/report/lavorazioni-year-matrix";

export type ReportChartConfig = {
  valueFormatter?: ReportValueFormatter;
};

export function ReportLineChart({
  rows,
  title,
  variant = "capital",
  forecast,
  embedded = false,
}: {
  rows: { label: string; value?: number; capitaleFinale?: number }[];
  title?: string;
  variant?: "capital" | "forecast";
  forecast?: {
    solid: YearForecastLinePoint[];
    dashed: YearForecastLinePoint[];
    forecastYear: number;
    forecastYearEnd: number | null;
  };
  embedded?: boolean;
}) {
  return (
    <ReportVisualization title={title} embedded={embedded}>
      {variant === "forecast" && forecast ? (
        <ReportBklitYearlyForecast
          solid={forecast.solid}
          dashed={forecast.dashed}
          forecastYear={forecast.forecastYear}
          forecastYearEnd={forecast.forecastYearEnd}
        />
      ) : (
        <ReportBklitCapitalLine
          rows={rows.map((r) => ({ label: r.label, capitaleFinale: r.capitaleFinale ?? r.value ?? 0 }))}
        />
      )}
    </ReportVisualization>
  );
}

export function ReportBarChart({
  points,
  title,
  embedded = false,
}: {
  points: { label: string; value: number; muted?: boolean }[];
  title?: string;
  embedded?: boolean;
}) {
  return (
    <ReportVisualization title={title} embedded={embedded}>
      <ReportBklitBarPoints points={points} />
    </ReportVisualization>
  );
}
