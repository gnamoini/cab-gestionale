import "server-only";

import { ensureHealthScoreRegistry } from "@/lib/health-score/bootstrap";
import { resolveHealthScoreConfigServer } from "@/lib/health-score/config/resolve-config.server";
import {
  getControlTowerHealthScoreHistoryFetchRange,
  getControlTowerLast30DaysRange,
  getControlTowerPrevious30DaysRange,
  getControlTowerWeeklyHealthScoreAnchors,
} from "@/lib/dashboard/control-tower-time-ranges";
import type { OperationalHealthTone } from "@/lib/dashboard/operational-health-score";
import {
  getHealthScoreHistoryCache,
  setHealthScoreHistoryCache,
} from "@/lib/health-score/cache/history-cache.server";
import { computeHealthScoreFromSnapshot } from "@/lib/health-score/engine/pipeline";
import { runHealthScoreServer } from "@/lib/health-score/engine/run-health-score.server";
import { buildInputSnapshot } from "@/lib/health-score/repository/input-snapshot.server";
import { fetchHealthScoreRawDataServer } from "@/lib/health-score/repository/fetch-inputs.server";
import { HEALTH_SCORE_ENGINE_VERSION } from "@/lib/health-score/versions";
import { ymdFromDate } from "@/lib/report/date-ranges";

export type HealthScoreWeeklyPoint = {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  score: number | null;
  tone: OperationalHealthTone;
  label: string;
};

function historyCacheKey(weeks: number, anchor: Date): string {
  return `history:${HEALTH_SCORE_ENGINE_VERSION}:${weeks}:${ymdFromDate(anchor)}`;
}

async function syncLastPointWithLiveScore(
  points: HealthScoreWeeklyPoint[],
  anchor: Date,
): Promise<HealthScoreWeeklyPoint[]> {
  if (points.length === 0) return points;

  const live = await runHealthScoreServer(anchor);
  const last = points[points.length - 1]!;
  const synced = [...points];
  synced[synced.length - 1] = {
    ...last,
    score: live.status === "READY" ? live.score : last.score,
    tone: live.tone,
    label: live.label,
  };
  return synced;
}

export async function runHealthScoreWeeklyHistoryServer(
  weeks = 26,
  anchor = new Date(),
): Promise<HealthScoreWeeklyPoint[]> {
  const safeWeeks = Math.max(1, Math.min(weeks, 52));
  const cacheKey = historyCacheKey(safeWeeks, anchor);
  const cached = getHealthScoreHistoryCache(cacheKey);
  if (cached) {
    return syncLastPointWithLiveScore(cached, anchor);
  }

  ensureHealthScoreRegistry();
  const config = await resolveHealthScoreConfigServer();

  const weeklyAnchors = getControlTowerWeeklyHealthScoreAnchors(anchor, safeWeeks);
  const fetchRange = getControlTowerHealthScoreHistoryFetchRange(anchor, safeWeeks);
  const raw = await fetchHealthScoreRawDataServer(fetchRange);

  let previousSmoothed: number | null = null;
  const points: HealthScoreWeeklyPoint[] = [];

  for (const week of weeklyAnchors) {
    const range = getControlTowerLast30DaysRange(week.anchor);
    const prevRange = getControlTowerPrevious30DaysRange(week.anchor);
    const snapshot = buildInputSnapshot({
      ...raw,
      range,
      prevRange,
      anchor: week.anchor,
    });

    const result = computeHealthScoreFromSnapshot({
      snapshot,
      config,
      anchor: week.anchor,
      range,
      prevRange,
      previousSmoothedScore: previousSmoothed,
      computedAt: week.anchor.toISOString(),
    });

    previousSmoothed = result.score;

    points.push({
      weekStart: week.weekStart.toISOString(),
      weekEnd: week.weekEnd.toISOString(),
      weekLabel: week.weekLabel,
      score: result.status === "READY" ? result.score : null,
      tone: result.tone,
      label: result.label,
    });
  }

  setHealthScoreHistoryCache(cacheKey, points);
  return syncLastPointWithLiveScore(points, anchor);
}
