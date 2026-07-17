"use client";

import { bumpReportDataRefresh } from "@/lib/report/report-broadcast";
import { useReportManualEntriesQuery } from "@/src/hooks/gestionale/use-report-queries";
import { useServiceMutation } from "@/src/hooks/use-service-mutation";
import { QK } from "@/src/lib/react-query/query-keys";
import {
  reportManualEntriesEntry,
  type ReportManualEntryUpsert,
} from "@/lib/domain/report-manual-entries-entry";
import type { ReportManualEntryRow } from "@/src/types/supabase-tables";

export { useReportManualEntriesQuery };

export function useReportManualEntryUpsertMutation() {
  return useServiceMutation((input: ReportManualEntryUpsert) => reportManualEntriesEntry.upsert(input), {
    invalidateQueryKeys: [QK.reportManualEntries],
    onSettled: () => bumpReportDataRefresh(),
  });
}

export function useReportManualEntryRemoveMutation() {
  return useServiceMutation((id: string) => reportManualEntriesEntry.remove(id), {
    invalidateQueryKeys: [QK.reportManualEntries],
    onSettled: () => bumpReportDataRefresh(),
  });
}

export type { ReportManualEntryRow, ReportManualEntryUpsert };
