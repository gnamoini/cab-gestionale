/**
 * MAP Observability & Analytics Plane — aggregation, snapshots, insights.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  clearMapObservabilityEventBuffer,
  collectMapObservabilityEvents,
  deduplicateMapEvents,
  type MapObservabilityEvent,
} from "@/lib/form-ux-migration/form-ux-map-event-ingestion";
import {
  buildMapObservabilitySnapshot,
  compareSnapshots,
  computeEligibilityRates,
  computeWaveEfficiency,
  generateMapObservabilityInsights,
  type MapObservabilityCorrelations,
  type MapObservabilitySnapshot,
} from "@/lib/form-ux-migration/form-ux-map-observability-plane";
import {
  clearFormUxMigrationEvents,
  getFormUxMapVersionEvents,
} from "@/lib/form-ux-migration/telemetry";

const root = process.cwd();

clearMapObservabilityEventBuffer();
clearFormUxMigrationEvents();
const versionEventsBefore = getFormUxMapVersionEvents().length;

const events = collectMapObservabilityEvents({ root, dedup: false, updateBuffer: true });
assert.ok(events.length > 0);

const classificationEvents = events.filter((e) => e.eventType === "classification");
const decisionEvents = events.filter((e) => e.eventType === "decision");
assert.ok(classificationEvents.length > 0);
assert.ok(decisionEvents.length > 0);
assert.ok(classificationEvents.some((e) => e.formId != null));

const dup: MapObservabilityEvent[] = [
  {
    eventType: "decision",
    fieldKey: "settings.a",
    formId: "settings",
    timestamp: 1_000_000,
    payload: { finalDecision: "EXCLUDE" },
  },
  {
    eventType: "decision",
    fieldKey: "settings.b",
    formId: "settings",
    timestamp: 1_000_500,
    payload: { finalDecision: "EXCLUDE" },
  },
];
const deduped = deduplicateMapEvents(dup, 60_000);
assert.equal(deduped.length, 1);

const snapA = buildMapObservabilitySnapshot({ root });
const snapB = buildMapObservabilitySnapshot({ root });
assert.deepEqual(snapA.classification.tierDistribution, snapB.classification.tierDistribution);
assert.equal(snapA.eligibility.includeRate, snapB.eligibility.includeRate);
assert.equal(snapA.eligibility.excludeRate, snapB.eligibility.excludeRate);
assert.equal(snapA.eligibility.holdRate, snapB.eligibility.holdRate);

const comparison = compareSnapshots(snapA, snapA);
assert.equal(comparison.delta.eligibility.includeRate, 0);
assert.equal(comparison.delta.waves.waveEfficiency, 0);
assert.equal(comparison.delta.versions.versionDriftIndex, 0);

const efficiency = computeWaveEfficiency([
  { wave: 1, structuralCount: 10, eligibleCount: 9, candidates: 9 },
]);
assert.ok(efficiency >= 0 && efficiency <= 1);
assert.equal(efficiency, 0.9);

const rates = computeEligibilityRates([
  { finalDecision: "INCLUDE" },
  { finalDecision: "EXCLUDE" },
  { finalDecision: "HOLD" },
  { finalDecision: "INCLUDE" },
]);
assert.equal(rates.includeRate, 0.5);
assert.equal(rates.excludeRate, 0.25);
assert.equal(rates.holdRate, 0.25);

const syntheticSnapshot: MapObservabilitySnapshot = {
  timestamp: Date.now(),
  classification: { tierDistribution: { "0B": 5 }, confidenceDistribution: {} },
  eligibility: { includeRate: 0.1, excludeRate: 0.2, holdRate: 0.1 },
  waves: {
    waveEfficiency: 0.5,
    inclusionRate: 0.2,
    rejectionRate: 0.6,
    byWave: { 1: { candidates: 2, excluded: 8, versionSkips: 1 } },
  },
  versions: {
    mapVersion: 1,
    compatibilityBreakdown: { CURRENT: 90, LEGACY: 2 },
    versionDriftIndex: 0.02,
  },
  stability: { tier0bStabilityScoreAvg: 0.7, driftTrend: "increasing" },
  insights: [],
};

const syntheticCorrelations: MapObservabilityCorrelations = {
  classificationToWave: {},
  eligibilityToDecision: {},
  versionToExclusion: { versionSkips: 1, waveRejections: 5, correlationRate: 0.2 },
  unstableByFormId: { settings: 4, mezzi: 1 },
  excludeRateByFormId: {
    settings: { total: 10, exclude: 9, rate: 0.9 },
    mezzi: { total: 10, exclude: 1, rate: 0.1 },
  },
};

const insights = generateMapObservabilityInsights(syntheticSnapshot, syntheticCorrelations);
assert.ok(insights.some((i) => i.code === "tier0b_instability_cluster"));
assert.ok(insights.some((i) => i.code === "eligibility_exclude_domain_spike"));
assert.ok(insights.some((i) => i.code === "wave_inclusion_version_mismatch"));
assert.ok(insights.some((i) => i.code === "drift_post_recalibration"));

assert.equal(getFormUxMapVersionEvents().length, versionEventsBefore);

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "map-obs-"));
try {
  const tmpEvents = collectMapObservabilityEvents({
    root: tmpRoot,
    updateBuffer: false,
    dedup: false,
  });
  assert.ok(Array.isArray(tmpEvents));
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}

console.log("form-ux-map-observability.test.ts OK");
