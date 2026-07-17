import { GLOBAL_FIRST_LOAD_JS_KB } from "@/lib/performance/performance-global-budgets";

export type PerformanceScoreInput = {
  build?: { firstLoadJsKb?: number | null; vendorChunkKb?: number | null };
  snapshot?: {
    routes?: Array<{
      route: string;
      payloadKb?: number | null;
      budget?: { maxPayloadKb?: number };
    }>;
    cacheHitRatio?: number | null;
  };
  lighthouse?: { lcpMs?: number; inpMs?: number; cls?: number; ttfbMs?: number };
  policyPass?: boolean;
  memoryMb?: number | null;
  hydrationMs?: number | null;
};

export type PerformanceScoreBreakdown = {
  bundle: number;
  network: number;
  rendering: number;
  cache: number;
  memory: number;
  webVitals: number;
  policy: number;
  total: number;
};

function scoreRatio(value: number | null | undefined, max: number): number {
  if (value == null || max <= 0) return 100;
  if (value <= max) return 100;
  const over = (value - max) / max;
  return Math.max(0, Math.round(100 - over * 100));
}

export function computePerformanceScore(input: PerformanceScoreInput): PerformanceScoreBreakdown {
  const firstLoad = input.build?.firstLoadJsKb ?? null;
  const bundle = scoreRatio(firstLoad, GLOBAL_FIRST_LOAD_JS_KB);

  const routes = input.snapshot?.routes ?? [];
  const payloadScores = routes
    .filter((r) => r.payloadKb != null && r.budget?.maxPayloadKb)
    .map((r) => scoreRatio(r.payloadKb, r.budget!.maxPayloadKb!));
  const network =
    payloadScores.length > 0
      ? Math.round(payloadScores.reduce((a, b) => a + b, 0) / payloadScores.length)
      : 100;

  const rendering = scoreRatio(input.hydrationMs, 3500);
  const cache =
    input.snapshot?.cacheHitRatio != null
      ? Math.round(Math.min(100, input.snapshot.cacheHitRatio * 100))
      : 100;
  const memory = scoreRatio(input.memoryMb, 512);
  const lh = input.lighthouse;
  const webVitalsParts = [
    scoreRatio(lh?.lcpMs, 3500),
    scoreRatio(lh?.inpMs, 300),
    lh?.cls != null ? scoreRatio(lh.cls * 1000, 150) : 100,
    scoreRatio(lh?.ttfbMs, 1200),
  ];
  const webVitals = Math.round(webVitalsParts.reduce((a, b) => a + b, 0) / webVitalsParts.length);
  const policy = input.policyPass === false ? 0 : 100;

  const total = Math.round(
    bundle * 0.2 +
      network * 0.2 +
      rendering * 0.15 +
      cache * 0.1 +
      memory * 0.1 +
      webVitals * 0.15 +
      policy * 0.1,
  );

  return { bundle, network, rendering, cache, memory, webVitals, policy, total };
}

export function compareScores(
  baseline: PerformanceScoreBreakdown,
  current: PerformanceScoreBreakdown,
): { delta: number; regressed: boolean } {
  const delta = current.total - baseline.total;
  return { delta, regressed: delta < -5 };
}
