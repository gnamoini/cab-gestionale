"use client";

import { bumpReportDataRefresh } from "@/lib/report/report-broadcast";
import { useReportViewQueryOpts } from "@/lib/view/view-query-opts";
import { useServiceMutation } from "@/src/hooks/use-service-mutation";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { QK } from "@/src/lib/react-query/query-keys";
import {
  reportManualEntriesEntry,
  type ReportManualEntryUpsert,
} from "@/lib/domain/report-manual-entries-entry";
import type { ReportManualEntryRow } from "@/src/types/supabase-tables";

export function useReportManualEntriesQuery() {
  const viewOpts = useReportViewQueryOpts();
  return useServiceQuery(QK.reportManualEntries, () => reportManualEntriesEntry.list(), viewOpts);
}

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
