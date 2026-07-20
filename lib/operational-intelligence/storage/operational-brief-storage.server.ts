import "server-only";

import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { OperationalBriefOutput } from "@/lib/operational-intelligence/types";
import type { OperationalPeriod } from "@/lib/operational-intelligence/period/types";

/** ponytail: best-effort persist — failure non blocca generazione */
export async function saveOperationalBrief(brief: OperationalBriefOutput): Promise<void> {
  try {
    const client = await createSupabaseServerUserClient();
    const period = brief.period;

    await client.from("operational_periods").upsert(
      {
        id: period.id,
        period_type: period.type,
        start_date: period.startDate,
        end_date: period.endDate,
        previous_period_id: period.previousPeriodId,
        label: period.label,
        status: period.status,
        generated_at: brief.generatedAt,
      },
      { onConflict: "id" },
    );

    await client.from("operational_briefs").insert({
      period_id: period.id,
      brief_json: brief,
      input_hash: brief.modelMetadata.inputHash,
      model: brief.modelMetadata.model,
      prompt_version: brief.modelMetadata.promptVersion,
      generated_at: brief.generatedAt,
    });
  } catch {
    /* storage optional — brief still returned to client */
  }
}

export async function listOperationalBriefHistory(
  periodId: string,
  limit = 10,
): Promise<OperationalBriefOutput[]> {
  try {
    const client = await createSupabaseServerUserClient();
    const { data, error } = await client
      .from("operational_briefs")
      .select("brief_json")
      .eq("period_id", periodId)
      .order("generated_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map((row) => row.brief_json as OperationalBriefOutput);
  } catch {
    return [];
  }
}

export async function getPreviousPeriodBrief(
  previousPeriodId: string | null,
): Promise<OperationalBriefOutput | null> {
  if (!previousPeriodId) return null;
  const history = await listOperationalBriefHistory(previousPeriodId, 1);
  return history[0] ?? null;
}

export async function listOperationalPeriods(limit = 20): Promise<OperationalPeriod[]> {
  try {
    const client = await createSupabaseServerUserClient();
    const { data, error } = await client
      .from("operational_periods")
      .select("*")
      .order("start_date", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map((row) => ({
      id: row.id as string,
      type: row.period_type as OperationalPeriod["type"],
      startDate: row.start_date as string,
      endDate: row.end_date as string,
      previousPeriodId: (row.previous_period_id as string | null) ?? null,
      label: row.label as string,
      status: row.status as OperationalPeriod["status"],
      generatedAt: (row.generated_at as string | null) ?? null,
    }));
  } catch {
    return [];
  }
}
