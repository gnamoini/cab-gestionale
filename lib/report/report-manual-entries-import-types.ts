export type ReportManualEntriesImportResult = {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  warnings: string[];
};
