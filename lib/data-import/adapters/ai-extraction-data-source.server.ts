import "server-only";

import type { DataSourceAdapter, DataSourceInput } from "@/lib/data-import/core/data-source";
import type { NormalizedDataset } from "@/lib/data-import/core/normalized-dataset";

/** ponytail: stub M4 — AI extraction converges to NormalizedDataset via import-core */
export const aiExtractionDataSourceAdapter: DataSourceAdapter = {
  kind: "ai_extraction",
  supportedExtensions: [".pdf", ".png", ".jpg", ".jpeg"],

  async parse(input: DataSourceInput): Promise<NormalizedDataset> {
    void input;
    throw new Error("AI extraction: usare /api/import/files/[id]/run (bridge M4).");
  },
};

export const csvDataSourceStub: DataSourceAdapter = {
  kind: "csv",
  supportedExtensions: [".csv"],
  async parse() {
    throw new Error("CSV adapter: in preparazione (M4).");
  },
};

export const jsonDataSourceStub: DataSourceAdapter = {
  kind: "json",
  supportedExtensions: [".json"],
  async parse() {
    throw new Error("JSON adapter: in preparazione (M4).");
  },
};

export const apiBulkDataSourceStub: DataSourceAdapter = {
  kind: "api_bulk",
  supportedExtensions: [],
  async parse() {
    throw new Error("API bulk adapter: in preparazione (M4).");
  },
};
