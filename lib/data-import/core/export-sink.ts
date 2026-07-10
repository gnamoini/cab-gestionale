import type { NormalizedDataset } from "@/lib/data-import/core/normalized-dataset";
import type { ImportExportFieldDef } from "@/lib/data-import/core/field-schema";

export type ExportSinkKind = "xlsx" | "csv" | "json" | "xml" | "zip";

export type ExportSinkInput = {
  dataset: NormalizedDataset;
  fields: ImportExportFieldDef[];
  fileName: string;
};

export interface ExportSinkAdapter {
  kind: ExportSinkKind;
  render(input: ExportSinkInput): Promise<Buffer>;
}
