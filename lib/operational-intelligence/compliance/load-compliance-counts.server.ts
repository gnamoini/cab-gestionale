import "server-only";

import { ASSET_COMPLIANCE_RULES_COLUMNS } from "@/lib/db/table-select-columns";
import { ymdFromDate } from "@/lib/report/date-ranges";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { AssetComplianceRuleRow } from "@/src/types/supabase-tables";

export type ComplianceInsightCounts = {
  overdue: number;
  due30d: number;
};

export async function loadComplianceInsightCounts(
  anchor = new Date(),
): Promise<ComplianceInsightCounts> {
  if (!(await verifyServerPageRead("mezzi"))) {
    return { overdue: 0, due30d: 0 };
  }

  const client = await createSupabaseServerUserClient();
  const todayYmd = ymdFromDate(anchor);
  const until = new Date(anchor);
  until.setDate(until.getDate() + 30);
  const untilYmd = ymdFromDate(until);

  const { data, error } = await client
    .from("asset_compliance_rules")
    .select(ASSET_COMPLIANCE_RULES_COLUMNS)
    .eq("is_active", true)
    .not("next_due_at", "is", null);

  if (error || !data) return { overdue: 0, due30d: 0 };

  let overdue = 0;
  let due30d = 0;
  for (const row of data as AssetComplianceRuleRow[]) {
    const due = row.next_due_at;
    if (!due) continue;
    if (due < todayYmd) overdue += 1;
    else if (due <= untilYmd) due30d += 1;
  }

  return { overdue, due30d };
}
