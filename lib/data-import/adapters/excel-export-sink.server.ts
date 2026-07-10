import "server-only";

import type { ExportSinkAdapter, ExportSinkInput } from "@/lib/data-import/core/export-sink";
import { buildWorkbookStructure } from "@/lib/data-import/core/workbook-builder.server";
import { renderWorkbookToXlsx } from "@/lib/data-import/core/workbook-styler.server";
import type { ExportMode } from "@/lib/data-import/core/field-schema";

export const excelExportSinkAdapter: ExportSinkAdapter = {
  kind: "xlsx",

  async render(input: ExportSinkInput): Promise<Buffer> {
    const mode = (input.dataset.exportMode ?? "importable") as ExportMode;
    const structure = buildWorkbookStructure(input.dataset, input.fields, mode);
    return renderWorkbookToXlsx(structure);
  },
};
