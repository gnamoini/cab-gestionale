"use client";

import { ASSET_TIMELINE_PROJECTION_COLUMNS } from "@/lib/db/table-select-columns";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { AssetTimelineProjectionRow } from "@/src/types/supabase-tables";
import { humanizeGestionaleError } from "@/src/utils/gestionale-error-messages";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";
import { endOfLocalDay, isoInRange, startOfLocalDay, type DateRange } from "@/lib/report/date-ranges";

async function sb() {
  return getBrowserSupabase();
}

export const assetTimelineService = {
  async listInRange(range: DateRange): Promise<ServiceResult<AssetTimelineProjectionRow[]>> {
    try {
      const client = await sb();
      const fromIso = startOfLocalDay(range.start).toISOString();
      const toIso = endOfLocalDay(range.end).toISOString();
      const { data, error } = await client
        .from("asset_timeline_projection")
        .select(ASSET_TIMELINE_PROJECTION_COLUMNS)
        .gte("event_at", fromIso)
        .lte("event_at", toIso)
        .order("event_at", { ascending: false });
      if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "read" }));
      return success((data ?? []) as AssetTimelineProjectionRow[]);
    } catch (e) {
      return serviceFailFromError<AssetTimelineProjectionRow[]>(e, [], { entity: "mezzo", action: "read" });
    }
  },

  filterRowsInRange(rows: AssetTimelineProjectionRow[], range: DateRange): AssetTimelineProjectionRow[] {
    return rows.filter((r) => isoInRange(r.event_at, range));
  },
};
