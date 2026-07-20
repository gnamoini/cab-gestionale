export { createReportDatasetContext, type ReportDatasetContext } from "@/lib/report/datasets/context";
export {
  canonicalMetricIds,
  assertCanonicalMetricsRegistered,
  checkDatasetAccess,
  getDatasetAccessPolicy,
  DATASET_ACCESS_POLICIES,
  type DatasetAccessPolicy,
  type ReportDatasetId,
} from "@/lib/report/datasets/registry";
export {
  type DatasetBuildResult,
  type DatasetMetricHealth,
  type DatasetMetricRow,
  wrapReportPayload,
} from "@/lib/report/datasets/types";
export { buildReportMetadataEnvelope } from "@/lib/report/datasets/metadata/build-report-metadata-envelope";
export { buildDatasetPayload } from "@/lib/report/datasets/build-dataset-payload";
export { buildLavorazioniDataset } from "@/lib/report/datasets/builders/lavorazioni";
export { buildMagazzinoDataset } from "@/lib/report/datasets/builders/magazzino";
export {
  buildEconomicoDataset,
  economicoDatasetWarnings,
} from "@/lib/report/datasets/builders/economico";
export { ECO_FATTURATO_SOURCE_PENDING } from "@/lib/report/datasets/builders/shared";
export { buildOreDataset } from "@/lib/report/datasets/builders/ore";
export { buildClientiDataset } from "@/lib/report/datasets/builders/clienti";
