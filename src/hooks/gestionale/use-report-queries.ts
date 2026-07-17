"use client";

import type { UseQueryOptions } from "@tanstack/react-query";
import { fetchLavorazioniListAuthorized } from "@/lib/lavorazioni/lavorazioni-list-fetch";
import { LAVORAZIONI_REPORT_FILTERS } from "@/lib/lavorazioni/lavorazioni-prefetch-filters";
import { reportManualEntriesEntry } from "@/lib/domain/report-manual-entries-entry";
import { lavorazioniListQueryKey, reportManualEntriesQueryKey } from "@/lib/render/query-key-factory";
import { useReportViewQueryOpts } from "@/lib/view/view-query-opts";
import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";
import { useSharedEntityQuery } from "@/src/hooks/use-shared-entity-query";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { ReportManualEntryRow } from "@/src/types/supabase-tables";

const LAVORAZIONI_REPORT_SCOPE = "lavorazioni.list.report" as const;
const REPORT_MANUAL_ENTRIES_SCOPE = "report.manualEntries" as const;

type RqOpts<T> = Omit<UseQueryOptions<T, Error, T, readonly unknown[]>, "queryKey" | "queryFn">;

export function useReportLavorazioniQuery(options?: RqOpts<LavorazioneListRow[]>) {
  const gestOpts = useGestionaleQueryOpts();
  const viewOpts = useReportViewQueryOpts();
  const queryKey = lavorazioniListQueryKey(LAVORAZIONI_REPORT_FILTERS, false);
  return useSharedEntityQuery({
    queryKey,
    queryFn: () => fetchLavorazioniListAuthorized(LAVORAZIONI_REPORT_FILTERS),
    entityType: "lavorazioni",
    scope: "list",
    ownershipScopeKey: LAVORAZIONI_REPORT_SCOPE,
    expectedServerKey: queryKey,
    ...gestOpts,
    ...viewOpts,
    ...options,
  });
}

export function useReportManualEntriesQuery(options?: RqOpts<ReportManualEntryRow[]>) {
  const gestOpts = useGestionaleQueryOpts();
  const viewOpts = useReportViewQueryOpts();
  const queryKey = reportManualEntriesQueryKey();
  return useSharedEntityQuery({
    queryKey,
    queryFn: () => reportManualEntriesEntry.list(),
    entityType: "report",
    scope: "manualEntries",
    ownershipScopeKey: REPORT_MANUAL_ENTRIES_SCOPE,
    expectedServerKey: queryKey,
    ...gestOpts,
    ...viewOpts,
    ...options,
  });
}

export type { ReportManualEntryRow };
