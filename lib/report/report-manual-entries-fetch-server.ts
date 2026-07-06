import "server-only";

import { cache } from "react";
import { REPORT_MANUAL_ENTRIES_COLUMNS } from "@/lib/db/table-select-columns";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { ReportManualEntryRow } from "@/src/types/supabase-tables";

async function fetchReportManualEntriesServer(): Promise<ServiceResult<ReportManualEntryRow[]>> {
  const allowed = await verifyServerPageRead("report");
  if (!allowed) return err("Permesso richiesto.");
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("report_manual_entries")
    .select(REPORT_MANUAL_ENTRIES_COLUMNS)
    .is("deleted_at", null)
    .order("period_month", { ascending: false });
  if (error) return err(error.message);
  return success((data ?? []) as ReportManualEntryRow[]);
}

export const getReportManualEntriesServer = cache(fetchReportManualEntriesServer);
