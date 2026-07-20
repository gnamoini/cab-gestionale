import "server-only";

import { OPERATIONAL_DIARY_ENTRIES_COLUMNS } from "@/lib/db/table-select-columns";
import { classifyDiaryEntry } from "@/lib/operational-intelligence/diary/classify-diary-entry";
import type { OperationalDiaryEntry } from "@/lib/operational-intelligence/types";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { OperationalDiaryEntryRow } from "@/src/types/supabase-tables";

export async function loadOperationalDiaryForPeriod(
  fromYmd: string,
  toYmd: string,
): Promise<OperationalDiaryEntry[]> {
  if (!(await verifyServerPageRead("dashboard"))) {
    return [];
  }

  const client = await createSupabaseServerUserClient();
  const { data, error } = await client
    .from("operational_diary_entries")
    .select(OPERATIONAL_DIARY_ENTRIES_COLUMNS)
    .is("deleted_at", null)
    .gte("work_date", fromYmd)
    .lte("work_date", toYmd)
    .order("work_date", { ascending: false });

  if (error || !data) return [];

  return (data as OperationalDiaryEntryRow[]).map((row) =>
    classifyDiaryEntry(row.work_date, row.body, row.id),
  );
}
