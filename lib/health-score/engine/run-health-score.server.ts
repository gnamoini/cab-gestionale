import "server-only";

import { ensureHealthScoreRegistry } from "@/lib/health-score/bootstrap";
import { hashHealthScoreConfig, resolveHealthScoreConfigServer } from "@/lib/health-score/config/resolve-config.server";
import {
  getHealthScoreResultCache,
  setHealthScoreResultCache,
} from "@/lib/health-score/cache/result-cache.server";
import {
  getInputAggregateCache,
  setInputAggregateCache,
} from "@/lib/health-score/cache/input-aggregate-cache.server";
import { computeHealthScoreFromSnapshot } from "@/lib/health-score/engine/pipeline";
import { hashInputSnapshot } from "@/lib/health-score/engine/determinism";
import { fetchHealthScoreInputsServer } from "@/lib/health-score/repository/fetch-inputs.server";
import {
  getLatestSmoothedScoreServer,
  persistHealthScoreRunServer,
} from "@/lib/health-score/repository/health-score-runs.repository.server";
import type { HealthScoreResult, InputSnapshot } from "@/lib/health-score/types";
import {
  HEALTH_SCORE_ENGINE_VERSION,
  HEALTH_SCORE_SCHEMA_VERSION,
} from "@/lib/health-score/versions";
import { ymdFromDate } from "@/lib/report/date-ranges";

function inputCacheKey(anchor: Date): string {
  return `input:v${HEALTH_SCORE_SCHEMA_VERSION}:${ymdFromDate(anchor)}`;
}

function resultCacheKey(configHash: string, inputHash: string): string {
  return `result:v${HEALTH_SCORE_ENGINE_VERSION}:s${HEALTH_SCORE_SCHEMA_VERSION}:c${configHash}:i${inputHash}`;
}

export async function runHealthScoreServer(anchor = new Date()): Promise<HealthScoreResult> {
  ensureHealthScoreRegistry();
  const started = Date.now();

  const config = await resolveHealthScoreConfigServer();
  const configHash = hashHealthScoreConfig(config);

  let snapshot: InputSnapshot;
  let range;
  let prevRange;

  const cachedInput = getInputAggregateCache<{
    snapshot: InputSnapshot;
    range: import("@/lib/report/date-ranges").DateRange;
    prevRange: import("@/lib/report/date-ranges").DateRange;
  }>(inputCacheKey(anchor));

  if (cachedInput) {
    snapshot = cachedInput.snapshot;
    range = cachedInput.range;
    prevRange = cachedInput.prevRange;
  } else {
    const fetched = await fetchHealthScoreInputsServer(anchor);
    snapshot = fetched.snapshot;
    range = fetched.range;
    prevRange = fetched.prevRange;
    setInputAggregateCache(inputCacheKey(anchor), { snapshot, range, prevRange });
  }

  const inputHash = hashInputSnapshot(snapshot);
  const resultKey = resultCacheKey(configHash, inputHash);
  const cachedResult = getHealthScoreResultCache(resultKey);
  if (cachedResult) return cachedResult;

  const previousSmoothed = await getLatestSmoothedScoreServer(HEALTH_SCORE_ENGINE_VERSION);

  const result = computeHealthScoreFromSnapshot({
    snapshot,
    config,
    anchor,
    range,
    prevRange,
    previousSmoothedScore: previousSmoothed,
    computedAt: anchor.toISOString(),
    cacheHit: false,
  });

  setHealthScoreResultCache(resultKey, result);

  void persistHealthScoreRunServer({
    result,
    snapshot,
    configHash,
    durationMs: Date.now() - started,
  });

  return result;
}
