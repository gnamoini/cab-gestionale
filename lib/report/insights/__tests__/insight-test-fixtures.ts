import type { AnalyticsDatasetBundle } from "@/lib/report/analytics/analytics-dataset-bundle";
import { buildReportCrossDto } from "@/lib/report/cross-analysis/build-report-cross-dto";
import type { ReportCrossDto } from "@/lib/report/cross-analysis/types";

export function insightFixtureBundle(): AnalyticsDatasetBundle {
  return {
    datasets: {
      lavorazioni: {
        metrics: [
          { id: "lav-periodo", value: 12, label: "Aperture" },
          { id: "lav-chiusi", value: 5, label: "Chiusure" },
          { id: "lav-aperti", value: 8, label: "Aperti" },
          { id: "lav-tempo", value: 4, label: "Tempo medio" },
          { id: "lav_late_sla", value: 0, label: "SLA" },
        ],
      },
      magazzino: {
        metrics: [
          { id: "scorta", value: 1, label: "Sotto scorta" },
          { id: "ric-usati", value: 20, label: "Ricambi" },
          { id: "mag_movement_value", value: 500, label: "Movimenti" },
        ],
      },
      economico: {
        metrics: [
          { id: "eco_fatturato", value: 2000, label: "Fatturato" },
          { id: "eco_da_incassare", value: 0, label: "Crediti" },
          { id: "eco_preventivi", value: 3, label: "Preventivi" },
        ],
        invoicesAvailable: true,
        metricHealth: { eco_fatturato: { status: "full" } },
      },
      ore: {
        metrics: [
          { id: "ore_total", value: 40, label: "Ore" },
          { id: "cost-tot", value: 800, label: "Costi" },
        ],
      },
    },
    metadata: {
      childMetadata: [
        {
          contractVersion: "2.0",
          generatedAt: "2026-01-01T00:00:00.000Z",
          trustStatus: "GREEN",
          sourceFreshness: "LIVE",
        },
      ],
      generatedAt: "2026-01-01T00:00:00.000Z",
    },
  };
}

export function insightFixtureCross(): ReportCrossDto {
  return buildReportCrossDto(insightFixtureBundle());
}
