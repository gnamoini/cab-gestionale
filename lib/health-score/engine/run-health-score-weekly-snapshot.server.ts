import "server-only";

import { getControlTowerWeekEndAnchor } from "@/lib/dashboard/control-tower-time-ranges";
import { runHealthScoreServer } from "@/lib/health-score/engine/run-health-score.server";
import { createSupabaseServerServiceClient } from "@/src/lib/supabase/server-service-client";
import { endOfLocalDay, startOfLocalDay, ymdFromDate } from "@/lib/report/date-ranges";
import { HEALTH_SCORE_ENGINE_VERSION } from "@/lib/health-score/versions";

export type HealthScoreWeeklySnapshotResult = {
  ok: boolean;
  skipped: boolean;
  reason?: string;
  score?: number;
  weekEnd?: string;
};

async function hasWeeklyRunForDay(weekEndYmd: string): Promise<boolean> {
  try {
    const sb = createSupabaseServerServiceClient();
    const start = startOfLocalDay(new Date(`${weekEndYmd}T12:00:00`));
    const end = endOfLocalDay(start);
    const { data } = await sb
      .from("health_score_runs")
      .select("id")
      .eq("engine_version", HEALTH_SCORE_ENGINE_VERSION)
      .gte("computed_at", start.toISOString())
      .lte("computed_at", end.toISOString())
      .limit(1)
      .maybeSingle();
    return Boolean(data?.id);
  } catch {
    return false;
  }
}

/** Snapshot settimanale — eseguito la domenica (cron), `computed_at` = fine settimana. */
export async function runHealthScoreWeeklySnapshotServer(now = new Date()): Promise<HealthScoreWeeklySnapshotResult> {
  const weekEnd = getControlTowerWeekEndAnchor(now);
  const weekEndYmd = ymdFromDate(weekEnd);
  const todayYmd = ymdFromDate(now);

  if (weekEndYmd !== todayYmd) {
    return { ok: true, skipped: true, reason: "not_week_end_sunday" };
  }

  if (await hasWeeklyRunForDay(weekEndYmd)) {
    return { ok: true, skipped: true, reason: "already_recorded", weekEnd: weekEndYmd };
  }

  const result = await runHealthScoreServer(weekEnd);
  return {
    ok: true,
    skipped: false,
    score: result.status === "READY" ? result.score : undefined,
    weekEnd: weekEndYmd,
  };
}
