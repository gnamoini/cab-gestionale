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
import { buildInputSnapshot } from "@/lib/health-score/repository/input-snapshot.server";
import { fetchHealthScoreRawDataServer } from "@/lib/health-score/repository/fetch-inputs.server";
import { HEALTH_SCORE_ENGINE_VERSION } from "@/lib/health-score/versions";

export type HealthScoreWeeklyPoint = {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  score: number | null;
  tone: OperationalHealthTone;
  label: string;
};

function historyCacheKey(weeks: number): string {
  return `history:${HEALTH_SCORE_ENGINE_VERSION}:${weeks}`;
}

export async function runHealthScoreWeeklyHistoryServer(
  weeks = 26,
  anchor = new Date(),
): Promise<HealthScoreWeeklyPoint[]> {
  const safeWeeks = Math.max(1, Math.min(weeks, 52));
  const cacheKey = historyCacheKey(safeWeeks);
  const cached = getHealthScoreHistoryCache(cacheKey);
  if (cached) return cached;

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
  return points;
}
