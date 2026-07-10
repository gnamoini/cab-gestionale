"use client";

import type { ReportManualEntriesImportResult } from "@/lib/report/report-manual-entries-import-types";

export type ReportManualEntriesImportResponse = ReportManualEntriesImportResult & {
  error?: string;
};

export async function importReportManualEntriesFromFile(
  file: File,
): Promise<ReportManualEntriesImportResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/report/manual-entries/import", {
    method: "POST",
    body: formData,
  });
  const body = (await res.json()) as ReportManualEntriesImportResponse;
  if (!res.ok) {
    throw new Error(body.error ?? "Import non riuscito.");
  }
  return body;
}

export function downloadReportManualEntriesTemplate(): void {
  window.location.assign("/api/report/manual-entries/import");
}
