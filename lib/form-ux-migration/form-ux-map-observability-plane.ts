import fs from "node:fs";
import path from "node:path";
import type { FormUxMigrationDecision } from "@/lib/form-ux-migration/form-ux-migration-decision-orchestrator";
import { classifyAllFields } from "@/lib/form-ux-migration/form-ux-migration-classifier";
import {
  collectMapObservabilityEvents,
  type MapObservabilityEvent,
} from "@/lib/form-ux-migration/form-ux-map-event-ingestion";
import { scanMigrationInventory } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import { resolveFormUxMigrationDecisionForField } from "@/lib/form-ux-migration/form-ux-migration-decision-orchestrator";
import { buildMigrationWaves } from "@/lib/form-ux-migration/form-ux-migration-queue";
import { MAP_VERSION } from "@/lib/form-ux-migration/form-ux-map-versioning";
import {
  detectAllTier0BDrift,
  readClassifierSnapshots,
  type TierDriftReport,
} from "@/lib/form-ux-migration/form-ux-tier-drift-detector";
import {
  buildWaveExecutionPlan,
  type WaveExecutionPlan,
} from "@/lib/form-ux-migration/form-ux-wave-executor";

export type MapObservabilityInsight = {
  code: string;
  severity: "info" | "warning" | "critical";
  message: string;
  context?: Record<string, unknown>;
};

export type MapObservabilitySnapshot = {
  timestamp: number;
  classification: {
    tierDistribution: Record<string, number>;
    confidenceDistribution: Record<string, number>;
  };
  eligibility: {
    includeRate: number;
    excludeRate: number;
    holdRate: number;
  };
  waves: {
    waveEfficiency: number;
    inclusionRate: number;
    rejectionRate: number;
    byWave: Record<number, { candidates: number; excluded: number; versionSkips: number }>;
  };
  versions: {
    mapVersion: number;
    compatibilityBreakdown: Record<string, number>;
    versionDriftIndex: number;
  };
  stability: {
    tier0bStabilityScoreAvg: number;
    driftTrend: "stable" | "increasing" | "decreasing";
  };
  insights: MapObservabilityInsight[];
};

export type MapObservabilityCorrelations = {
  classificationToWave: Record<string, { total: number; included: number; rate: number }>;
  eligibilityToDecision: Record<string, { count: number; decisions: Record<string, number> }>;
  versionToExclusion: {
    versionSkips: number;
    waveRejections: number;
    correlationRate: number;
  };
  unstableByFormId: Record<string, number>;
  excludeRateByFormId: Record<string, { total: number; exclude: number; rate: number }>;
};

const DEFAULT_SNAPSHOT_DIR = "map/observability/snapshots";

function confidenceBucket(score: number): string {
  if (score >= 0.9) return "0.90-1.00";
  if (score >= 0.8) return "0.80-0.89";
  if (score >= 0.7) return "0.70-0.79";
  if (score >= 0.65) return "0.65-0.69";
  return "below_0.65";
}

export function aggregateMapEvents(events: MapObservabilityEvent[]): {
  byType: Record<string, MapObservabilityEvent[]>;
  total: number;
} {
  const byType: Record<string, MapObservabilityEvent[]> = {};
  for (const event of events) {
    const bucket = byType[event.eventType] ?? [];
    bucket.push(event);
    byType[event.eventType] = bucket;
  }
  return { byType, total: events.length };
}

export function groupByFormId(
  events: MapObservabilityEvent[],
): Record<string, MapObservabilityEvent[]> {
  const groups: Record<string, MapObservabilityEvent[]> = {};
  for (const event of events) {
    const key = event.formId ?? "unknown";
    const bucket = groups[key] ?? [];
    bucket.push(event);
    groups[key] = bucket;
  }
  return groups;
}

export function groupByTier(
  events: MapObservabilityEvent[],
): Record<string, MapObservabilityEvent[]> {
  const groups: Record<string, MapObservabilityEvent[]> = {};
  for (const event of events) {
    if (event.eventType !== "classification") continue;
    const tier = String(event.payload.tierBand ?? "unknown");
    const bucket = groups[tier] ?? [];
    bucket.push(event);
    groups[tier] = bucket;
  }
  return groups;
}

export function groupByWaveId(
  events: MapObservabilityEvent[],
): Record<number, MapObservabilityEvent[]> {
  const groups: Record<number, MapObservabilityEvent[]> = {};
  for (const event of events) {
    if (event.eventType !== "wave") continue;
    const wave = Number(event.payload.wave ?? 0);
    const bucket = groups[wave] ?? [];
    bucket.push(event);
    groups[wave] = bucket;
  }
  return groups;
}

export function groupByMapVersion(
  events: MapObservabilityEvent[],
): Record<string, MapObservabilityEvent[]> {
  const groups: Record<string, MapObservabilityEvent[]> = {};
  for (const event of events) {
    const version = String(
      event.payload.mapVersion ??
        event.payload.evaluatedAgainstMapVersion ??
        event.payload.compatibilityStatus ??
        "unknown",
    );
    const bucket = groups[version] ?? [];
    bucket.push(event);
    groups[version] = bucket;
  }
  return groups;
}

export function computeTierDistribution(
  classifications: Array<{ tierBand: string }>,
): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const c of classifications) {
    dist[c.tierBand] = (dist[c.tierBand] ?? 0) + 1;
  }
  return dist;
}

export function computeConfidenceDistribution(
  classifications: Array<{ tier0ConfidenceScore: number }>,
): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const c of classifications) {
    const bucket = confidenceBucket(c.tier0ConfidenceScore);
    dist[bucket] = (dist[bucket] ?? 0) + 1;
  }
  return dist;
}

export function computeEligibilityRates(
  decisions: Array<{ finalDecision: string }>,
): { includeRate: number; excludeRate: number; holdRate: number } {
  if (decisions.length === 0) {
    return { includeRate: 0, excludeRate: 0, holdRate: 0 };
  }
  let include = 0;
  let exclude = 0;
  let hold = 0;
  for (const d of decisions) {
    if (d.finalDecision === "INCLUDE") include += 1;
    else if (d.finalDecision === "EXCLUDE") exclude += 1;
    else hold += 1;
  }
  const total = decisions.length;
  return {
    includeRate: include / total,
    excludeRate: exclude / total,
    holdRate: hold / total,
  };
}

export type WaveEfficiencyInput = {
  wave: number;
  structuralCount: number;
  eligibleCount: number;
  candidates: number;
};

export function computeWaveEfficiency(
  wavePlans: WaveEfficiencyInput[],
): number {
  if (wavePlans.length === 0) return 0;
  let totalStructural = 0;
  let totalEligible = 0;
  for (const plan of wavePlans) {
    totalStructural += plan.structuralCount;
    totalEligible += plan.eligibleCount;
  }
  if (totalStructural === 0) return 0;
  return Math.round((totalEligible / totalStructural) * 1000) / 1000;
}

export function computeDriftIndex(driftReport: TierDriftReport): number {
  return driftReport.averageDriftScore;
}

export function computeVersionStabilityScore(
  decisions: Array<{ compatibilityStatus: string }>,
): number {
  if (decisions.length === 0) return 1;
  const current = decisions.filter((d) => d.compatibilityStatus === "CURRENT").length;
  return Math.round((current / decisions.length) * 1000) / 1000;
}

export function correlateClassificationToWaveOutcome(
  classifications: Array<{ fieldKey: string; tierBand: string }>,
  wavePlans: Map<number, WaveExecutionPlan>,
  decisions: FormUxMigrationDecision[],
): Record<string, { total: number; included: number; rate: number }> {
  const decisionByKey = new Map(decisions.map((d) => [d.classification.fieldKey, d]));
  const includedKeys = new Set<string>();
  for (const plan of wavePlans.values()) {
    for (const c of plan.manifest.candidates) {
      if (c.eligible) includedKeys.add(c.fieldKey);
    }
  }

  const result: Record<string, { total: number; included: number; rate: number }> = {};
  for (const cls of classifications) {
    const tier = cls.tierBand;
    const bucket = result[tier] ?? { total: 0, included: 0, rate: 0 };
    bucket.total += 1;
    const decision = decisionByKey.get(cls.fieldKey);
    if (decision?.finalDecision === "INCLUDE" || includedKeys.has(cls.fieldKey)) {
      bucket.included += 1;
    }
    bucket.rate = bucket.total > 0 ? bucket.included / bucket.total : 0;
    result[tier] = bucket;
  }
  return result;
}

export function correlateEligibilityToFinalDecision(
  eligibilityEvents: MapObservabilityEvent[],
  decisionEvents: MapObservabilityEvent[],
): Record<string, { count: number; decisions: Record<string, number> }> {
  const decisionByKey = new Map(
    decisionEvents.map((e) => [e.fieldKey, String(e.payload.finalDecision)]),
  );
  const result: Record<string, { count: number; decisions: Record<string, number> }> = {};

  for (const event of eligibilityEvents) {
    const blockers = (event.payload.eligibilityBlockers as string[] | undefined) ?? [];
    const primaryBlocker = blockers[0] ?? "none";
    const bucket = result[primaryBlocker] ?? { count: 0, decisions: {} };
    bucket.count += 1;
    const decision = decisionByKey.get(event.fieldKey) ?? "UNKNOWN";
    bucket.decisions[decision] = (bucket.decisions[decision] ?? 0) + 1;
    result[primaryBlocker] = bucket;
  }
  return result;
}

export function correlateVersionToExclusionRate(
  wavePlans: Map<number, WaveExecutionPlan>,
): { versionSkips: number; waveRejections: number; correlationRate: number } {
  let versionSkips = 0;
  let waveRejections = 0;
  for (const plan of wavePlans.values()) {
    versionSkips += plan.incompatibleVersionSkips.length;
    waveRejections += plan.manifest.excludedCount + plan.driftAdjustedCandidates.length;
  }
  const correlationRate =
    waveRejections > 0 ? Math.min(1, versionSkips / waveRejections) : versionSkips > 0 ? 1 : 0;
  return { versionSkips, waveRejections, correlationRate };
}

function resolveDriftTrend(
  currentDrift: number,
  options?: { root?: string },
): "stable" | "increasing" | "decreasing" {
  const root = options?.root ?? process.cwd();
  const snapshots = readClassifierSnapshots({ root, limit: 2 });
  if (snapshots.length < 2) return "stable";

  const prior = snapshots[snapshots.length - 2];
  const latest = snapshots[snapshots.length - 1];
  if (!prior || !latest) return "stable";

  const priorAvg =
    prior.fields.length > 0
      ? prior.fields.reduce((s, f) => s + f.tier0ConfidenceScore, 0) / prior.fields.length
      : 0;
  const latestAvg =
    latest.fields.length > 0
      ? latest.fields.reduce((s, f) => s + f.tier0ConfidenceScore, 0) / latest.fields.length
      : 0;

  const delta = priorAvg - latestAvg;
  if (delta > 0.05 || currentDrift > 0.3) return "increasing";
  if (delta < -0.05) return "decreasing";
  return "stable";
}

export function buildMapObservabilityCorrelations(options?: {
  root?: string;
}): MapObservabilityCorrelations {
  const root = options?.root ?? process.cwd();
  const { fields } = scanMigrationInventory({ root });
  const profiles = classifyAllFields(fields, { root });
  const decisions = fields.map((f) => resolveFormUxMigrationDecisionForField(f, { root }));
  const waves = buildMigrationWaves(profiles);
  const wavePlans = new Map<number, WaveExecutionPlan>();
  for (const w of waves) {
    wavePlans.set(w.wave, buildWaveExecutionPlan(w.wave, { root }));
  }

  const events = collectMapObservabilityEvents({ root, updateBuffer: false });
  const eligibilityEvents = events.filter((e) => e.eventType === "eligibility");
  const decisionEvents = events.filter((e) => e.eventType === "decision");
  const stabilityFieldEvents = events.filter(
    (e) => e.eventType === "stability" && e.fieldKey !== "global",
  );

  const unstableByFormId: Record<string, number> = {};
  const excludeRateByFormId: Record<string, { total: number; exclude: number; rate: number }> =
    {};

  for (const event of stabilityFieldEvents) {
    if (event.payload.driftTrend === "unstable") {
      const fid = event.formId ?? "unknown";
      unstableByFormId[fid] = (unstableByFormId[fid] ?? 0) + 1;
    }
  }

  for (const event of decisionEvents) {
    const fid = event.formId ?? "unknown";
    const bucket = excludeRateByFormId[fid] ?? { total: 0, exclude: 0, rate: 0 };
    bucket.total += 1;
    if (event.payload.finalDecision === "EXCLUDE") bucket.exclude += 1;
    bucket.rate = bucket.total > 0 ? bucket.exclude / bucket.total : 0;
    excludeRateByFormId[fid] = bucket;
  }

  return {
    classificationToWave: correlateClassificationToWaveOutcome(
      profiles,
      wavePlans,
      decisions,
    ),
    eligibilityToDecision: correlateEligibilityToFinalDecision(
      eligibilityEvents,
      decisionEvents,
    ),
    versionToExclusion: correlateVersionToExclusionRate(wavePlans),
    unstableByFormId,
    excludeRateByFormId,
  };
}

export function generateMapObservabilityInsights(
  snapshot: MapObservabilitySnapshot,
  correlations: MapObservabilityCorrelations,
  options?: { previousSnapshot?: MapObservabilitySnapshot },
): MapObservabilityInsight[] {
  const insights: MapObservabilityInsight[] = [];

  for (const [formId, count] of Object.entries(correlations.unstableByFormId)) {
    if (count >= 3) {
      insights.push({
        code: "tier0b_instability_cluster",
        severity: "warning",
        message: "Tier 0B instability clusters detected",
        context: { formId, unstableCount: count },
      });
    }
  }

  const versionSkips = Object.values(snapshot.waves.byWave).reduce(
    (s, w) => s + w.versionSkips,
    0,
  );
  if (versionSkips > 0) {
    const prevInclusion = options?.previousSnapshot?.waves.inclusionRate;
    const inclusionDrop =
      prevInclusion != null && snapshot.waves.inclusionRate < prevInclusion - 0.05;
    if (inclusionDrop || versionSkips > 0) {
      insights.push({
        code: "wave_inclusion_version_mismatch",
        severity: "warning",
        message: "Wave inclusion rate drop correlated with version mismatch",
        context: {
          versionSkips,
          inclusionRate: snapshot.waves.inclusionRate,
          previousInclusionRate: prevInclusion,
        },
      });
    }
  }

  const globalExclude = snapshot.eligibility.excludeRate;
  for (const [formId, stats] of Object.entries(correlations.excludeRateByFormId)) {
    if (stats.total >= 3 && stats.rate > globalExclude * 2 && stats.rate > 0.3) {
      insights.push({
        code: "eligibility_exclude_domain_spike",
        severity: "warning",
        message: "Eligibility EXCLUDE spike on specific domain",
        context: { formId, excludeRate: stats.rate, globalExcludeRate: globalExclude },
      });
    }
  }

  if (snapshot.stability.driftTrend === "increasing") {
    insights.push({
      code: "drift_post_recalibration",
      severity: "info",
      message: "Drift increase after classifier recalibration",
      context: {
        driftTrend: snapshot.stability.driftTrend,
        tier0bStabilityScoreAvg: snapshot.stability.tier0bStabilityScoreAvg,
      },
    });
  }

  return insights;
}

export function buildMapObservabilitySnapshot(options?: {
  root?: string;
  previousSnapshot?: MapObservabilitySnapshot;
}): MapObservabilitySnapshot {
  const root = options?.root ?? process.cwd();
  const timestamp = Date.now();

  const { fields } = scanMigrationInventory({ root });
  const profiles = classifyAllFields(fields, { root });
  const decisions = fields.map((f) => resolveFormUxMigrationDecisionForField(f, { root }));
  const driftReport = detectAllTier0BDrift(fields, profiles, { root });
  const waves = buildMigrationWaves(profiles);

  const waveEfficiencyInputs: WaveEfficiencyInput[] = [];
  const byWave: MapObservabilitySnapshot["waves"]["byWave"] = {};
  let totalStructural = 0;
  let totalIncluded = 0;
  let totalRejected = 0;

  for (const w of waves) {
    const plan = buildWaveExecutionPlan(w.wave, { root });
    const eligibleCount = plan.manifest.candidates.filter((c) => c.eligible).length;
    waveEfficiencyInputs.push({
      wave: w.wave,
      structuralCount: w.fieldCount,
      eligibleCount,
      candidates: plan.manifest.candidates.length,
    });
    byWave[w.wave] = {
      candidates: plan.manifest.candidates.length,
      excluded: plan.manifest.excludedCount + plan.driftAdjustedCandidates.length,
      versionSkips: plan.incompatibleVersionSkips.length,
    };
    totalStructural += w.fieldCount;
    totalIncluded += plan.manifest.candidates.length;
    totalRejected +=
      plan.manifest.excludedCount +
      plan.driftAdjustedCandidates.length +
      plan.incompatibleVersionSkips.length;
  }

  const tier0bScores = decisions
    .filter((d) => d.classification.tierBand === "0B")
    .map((d) => d.eligibility.tier0bStabilityScore);
  const tier0bStabilityScoreAvg =
    tier0bScores.length > 0
      ? Math.round(
          (tier0bScores.reduce((s, v) => s + v, 0) / tier0bScores.length) * 1000,
        ) / 1000
      : 0;

  const compatibilityBreakdown: Record<string, number> = {};
  for (const d of decisions) {
    const status = d.compatibilityStatus;
    compatibilityBreakdown[status] = (compatibilityBreakdown[status] ?? 0) + 1;
  }

  const nonCurrent =
    (compatibilityBreakdown.LEGACY ?? 0) + (compatibilityBreakdown.FUTURE_INCOMPATIBLE ?? 0);
  const versionDriftIndex =
    decisions.length > 0 ? Math.round((nonCurrent / decisions.length) * 1000) / 1000 : 0;

  const eligibilityRates = computeEligibilityRates(decisions);
  const inclusionRate =
    totalStructural > 0 ? Math.round((totalIncluded / totalStructural) * 1000) / 1000 : 0;
  const rejectionRate =
    totalStructural > 0 ? Math.round((totalRejected / totalStructural) * 1000) / 1000 : 0;

  const correlations = buildMapObservabilityCorrelations({ root });

  const snapshot: MapObservabilitySnapshot = {
    timestamp,
    classification: {
      tierDistribution: computeTierDistribution(profiles),
      confidenceDistribution: computeConfidenceDistribution(profiles),
    },
    eligibility: eligibilityRates,
    waves: {
      waveEfficiency: computeWaveEfficiency(waveEfficiencyInputs),
      inclusionRate,
      rejectionRate,
      byWave,
    },
    versions: {
      mapVersion: MAP_VERSION,
      compatibilityBreakdown,
      versionDriftIndex,
    },
    stability: {
      tier0bStabilityScoreAvg,
      driftTrend: resolveDriftTrend(driftReport.averageDriftScore, { root }),
    },
    insights: [],
  };

  snapshot.insights = generateMapObservabilityInsights(
    snapshot,
    correlations,
    { previousSnapshot: options?.previousSnapshot },
  );

  return snapshot;
}

export type MapObservabilityDelta = {
  classification: {
    tierDistribution: Record<string, number>;
    confidenceDistribution: Record<string, number>;
  };
  eligibility: {
    includeRate: number;
    excludeRate: number;
    holdRate: number;
  };
  waves: {
    waveEfficiency: number;
    inclusionRate: number;
    rejectionRate: number;
  };
  versions: {
    versionDriftIndex: number;
  };
  stability: {
    tier0bStabilityScoreAvg: number;
  };
};

export function computeDeltaMetrics(
  previous: MapObservabilitySnapshot,
  current: MapObservabilitySnapshot,
): MapObservabilityDelta {
  const tierDelta: Record<string, number> = {};
  const allTiers = new Set([
    ...Object.keys(previous.classification.tierDistribution),
    ...Object.keys(current.classification.tierDistribution),
  ]);
  for (const tier of allTiers) {
    tierDelta[tier] =
      (current.classification.tierDistribution[tier] ?? 0) -
      (previous.classification.tierDistribution[tier] ?? 0);
  }

  const confDelta: Record<string, number> = {};
  const allBuckets = new Set([
    ...Object.keys(previous.classification.confidenceDistribution),
    ...Object.keys(current.classification.confidenceDistribution),
  ]);
  for (const bucket of allBuckets) {
    confDelta[bucket] =
      (current.classification.confidenceDistribution[bucket] ?? 0) -
      (previous.classification.confidenceDistribution[bucket] ?? 0);
  }

  return {
    classification: {
      tierDistribution: tierDelta,
      confidenceDistribution: confDelta,
    },
    eligibility: {
      includeRate: current.eligibility.includeRate - previous.eligibility.includeRate,
      excludeRate: current.eligibility.excludeRate - previous.eligibility.excludeRate,
      holdRate: current.eligibility.holdRate - previous.eligibility.holdRate,
    },
    waves: {
      waveEfficiency: current.waves.waveEfficiency - previous.waves.waveEfficiency,
      inclusionRate: current.waves.inclusionRate - previous.waves.inclusionRate,
      rejectionRate: current.waves.rejectionRate - previous.waves.rejectionRate,
    },
    versions: {
      versionDriftIndex:
        current.versions.versionDriftIndex - previous.versions.versionDriftIndex,
    },
    stability: {
      tier0bStabilityScoreAvg:
        current.stability.tier0bStabilityScoreAvg -
        previous.stability.tier0bStabilityScoreAvg,
    },
  };
}

export function compareSnapshots(
  previous: MapObservabilitySnapshot,
  current: MapObservabilitySnapshot,
): {
  delta: MapObservabilityDelta;
  newInsights: MapObservabilityInsight[];
} {
  const correlations = buildMapObservabilityCorrelations();
  const newInsights = generateMapObservabilityInsights(current, correlations, {
    previousSnapshot: previous,
  });
  return {
    delta: computeDeltaMetrics(previous, current),
    newInsights,
  };
}

export function writeMapObservabilitySnapshot(
  snapshot: MapObservabilitySnapshot,
  options?: { root?: string; filePath?: string },
): string {
  const root = options?.root ?? process.cwd();
  const dir = path.join(root, DEFAULT_SNAPSHOT_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const iso = new Date(snapshot.timestamp).toISOString().replace(/[:.]/g, "-");
  const outPath =
    options?.filePath ?? path.join(dir, `map-obs-${iso}.json`);
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2), "utf8");
  return outPath;
}

export function readMapObservabilitySnapshots(options?: {
  root?: string;
  limit?: number;
}): MapObservabilitySnapshot[] {
  const root = options?.root ?? process.cwd();
  const dir = path.join(root, DEFAULT_SNAPSHOT_DIR);
  if (!fs.existsSync(dir)) return [];

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith("map-obs-") && f.endsWith(".json"))
    .map((f) => path.join(dir, f))
    .sort();

  const limit = options?.limit ?? files.length;
  const snapshots: MapObservabilitySnapshot[] = [];
  for (const file of files.slice(-limit)) {
    try {
      snapshots.push(JSON.parse(fs.readFileSync(file, "utf8")) as MapObservabilitySnapshot);
    } catch {
      // skip corrupt
    }
  }
  return snapshots;
}

export function formatMapObservabilityReport(snapshot: MapObservabilitySnapshot): string {
  const lines = [
    "MAP OBSERVABILITY REPORT",
    "",
    "Tier distribution",
  ];

  for (const [tier, count] of Object.entries(snapshot.classification.tierDistribution).sort()) {
    lines.push(`  ${tier}: ${count}`);
  }

  lines.push("", "Confidence distribution");
  for (const [bucket, count] of Object.entries(
    snapshot.classification.confidenceDistribution,
  ).sort()) {
    lines.push(`  ${bucket}: ${count}`);
  }

  lines.push(
    "",
    "Eligibility rates",
    `  INCLUDE: ${(snapshot.eligibility.includeRate * 100).toFixed(1)}%`,
    `  EXCLUDE: ${(snapshot.eligibility.excludeRate * 100).toFixed(1)}%`,
    `  HOLD:    ${(snapshot.eligibility.holdRate * 100).toFixed(1)}%`,
    "",
    "Wave efficiency",
    `  Efficiency: ${(snapshot.waves.waveEfficiency * 100).toFixed(1)}%`,
    `  Inclusion rate: ${(snapshot.waves.inclusionRate * 100).toFixed(1)}%`,
    `  Rejection rate: ${(snapshot.waves.rejectionRate * 100).toFixed(1)}%`,
  );

  lines.push("", "Per-wave breakdown");
  for (const [wave, stats] of Object.entries(snapshot.waves.byWave).sort(
    (a, b) => Number(a[0]) - Number(b[0]),
  )) {
    lines.push(
      `  Wave ${wave}: candidates=${stats.candidates} excluded=${stats.excluded} versionSkips=${stats.versionSkips}`,
    );
  }

  lines.push(
    "",
    "Version compatibility health",
    `  MAP version: ${snapshot.versions.mapVersion}`,
    `  Version drift index: ${snapshot.versions.versionDriftIndex}`,
  );
  for (const [status, count] of Object.entries(snapshot.versions.compatibilityBreakdown)) {
    lines.push(`  ${status}: ${count}`);
  }

  lines.push(
    "",
    "Stability regression signals",
    `  Tier 0B stability avg: ${snapshot.stability.tier0bStabilityScoreAvg}`,
    `  Drift trend: ${snapshot.stability.driftTrend}`,
    "",
    "Drift hotspots",
  );

  const correlations = buildMapObservabilityCorrelations();
  const hotspots = Object.entries(correlations.unstableByFormId)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  if (hotspots.length === 0) {
    lines.push("  (none detected)");
  } else {
    for (const [formId, count] of hotspots.slice(0, 10)) {
      lines.push(`  ${formId}: ${count} unstable 0B field(s)`);
    }
  }

  lines.push("", "Insights");
  if (snapshot.insights.length === 0) {
    lines.push("  (none)");
  } else {
    snapshot.insights.forEach((insight, i) => {
      lines.push(`  ${i + 1}. [${insight.severity}] ${insight.message} (${insight.code})`);
    });
  }

  return lines.join("\n");
}

export function formatWaveEfficiencyReport(options?: {
  root?: string;
  wave?: number;
}): string {
  const root = options?.root ?? process.cwd();
  const snapshot = buildMapObservabilitySnapshot({ root });
  const lines = ["MAP WAVE EFFICIENCY REPORT", ""];

  const waveEntries = Object.entries(snapshot.waves.byWave).sort(
    (a, b) => Number(a[0]) - Number(b[0]),
  );

  for (const [waveStr, stats] of waveEntries) {
    const waveNum = Number(waveStr);
    if (options?.wave != null && waveNum !== options.wave) continue;
    const structuralRaw = collectMapObservabilityEvents({ root, updateBuffer: false }).find(
      (e) => e.eventType === "wave" && e.payload.wave === waveNum,
    )?.payload.structuralCount;
    const structural = typeof structuralRaw === "number" ? structuralRaw : 0;
    const efficiency =
      structural > 0
        ? Math.round((stats.candidates / structural) * 1000) / 1000
        : 0;
    lines.push(`Wave ${waveNum}`);
    lines.push(`  Structural fields: ${structural}`);
    lines.push(`  Candidates: ${stats.candidates}`);
    lines.push(`  Excluded: ${stats.excluded}`);
    lines.push(`  Version skips: ${stats.versionSkips}`);
    lines.push(`  Efficiency: ${(efficiency * 100).toFixed(1)}%`);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
