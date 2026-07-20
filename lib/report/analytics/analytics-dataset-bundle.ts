import type { ReportDatasetContext } from "@/lib/report/datasets/context";
import type { ReportDatasetSlices } from "@/lib/report/datasets/builders/shared";
import { buildLavorazioniDataset } from "@/lib/report/datasets/builders/lavorazioni";
import { buildMagazzinoDataset } from "@/lib/report/datasets/builders/magazzino";
import {
  buildEconomicoDataset,
  economicoDatasetWarnings,
} from "@/lib/report/datasets/builders/economico";
import { buildOreDataset } from "@/lib/report/datasets/builders/ore";
import { buildReportMetadataEnvelope } from "@/lib/report/datasets/metadata/build-report-metadata-envelope";
import type { ReportMetadataEnvelope } from "@/lib/report/contracts/metadata-envelope";
import type { LavorazioniDatasetData } from "@/lib/report/datasets/builders/lavorazioni";
import type { MagazzinoDatasetData } from "@/lib/report/datasets/builders/magazzino";
import type { EconomicoDatasetData } from "@/lib/report/datasets/builders/economico";
import type { OreDatasetData } from "@/lib/report/datasets/builders/ore";

export type AnalyticsDatasetBundle = {
  datasets: {
    lavorazioni: LavorazioniDatasetData;
    magazzino: MagazzinoDatasetData;
    economico: EconomicoDatasetData;
    ore: OreDatasetData;
  };
  metadata: {
    childMetadata: ReportMetadataEnvelope[];
    generatedAt: string;
  };
};

export type BuildAnalyticsDatasetBundleInput = {
  lavorazioniCtx: ReportDatasetContext;
  magazzinoCtx: ReportDatasetContext;
  economicoCtx: ReportDatasetContext;
  oreCtx: ReportDatasetContext;
  baseSlices: ReportDatasetSlices;
  economicoSlices: ReportDatasetSlices;
  oreSlices: ReportDatasetSlices;
};

export function buildAnalyticsDatasetBundle(
  input: BuildAnalyticsDatasetBundleInput,
): AnalyticsDatasetBundle {
  const lavorazioniResult = buildLavorazioniDataset(input.lavorazioniCtx, input.baseSlices);
  const magazzinoResult = buildMagazzinoDataset(input.magazzinoCtx, input.baseSlices);
  const economicoResult = buildEconomicoDataset(input.economicoCtx, input.economicoSlices);
  const oreResult = buildOreDataset(input.oreCtx, input.oreSlices);
  const economicoWarnings = economicoDatasetWarnings(economicoResult.data);

  const childMetadata = [
    buildReportMetadataEnvelope(input.lavorazioniCtx),
    buildReportMetadataEnvelope(input.magazzinoCtx),
    buildReportMetadataEnvelope(input.economicoCtx, economicoWarnings),
    buildReportMetadataEnvelope(input.oreCtx),
  ];

  return {
    datasets: {
      lavorazioni: lavorazioniResult.data,
      magazzino: magazzinoResult.data,
      economico: economicoResult.data,
      ore: oreResult.data,
    },
    metadata: {
      childMetadata,
      generatedAt: new Date().toISOString(),
    },
  };
}
