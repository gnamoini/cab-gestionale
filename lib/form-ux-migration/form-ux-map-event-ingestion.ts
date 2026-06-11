import fs from "node:fs";
import path from "node:path";
import { classifyAllFields } from "@/lib/form-ux-migration/form-ux-migration-classifier";
import { resolveFormUxMigrationDecisionForField } from "@/lib/form-ux-migration/form-ux-migration-decision-orchestrator";
import { scanMigrationInventory } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import { buildMigrationWaves } from "@/lib/form-ux-migration/form-ux-migration-queue";
import { detectAllTier0BDrift } from "@/lib/form-ux-migration/form-ux-tier-drift-detector";
import { buildTierStabilityReport } from "@/lib/form-ux-migration/form-ux-tier-stability-report";
import { buildWaveExecutionPlan } from "@/lib/form-ux-migration/form-ux-wave-executor";
import { getFormUxMapVersionEvents } from "@/lib/form-ux-migration/telemetry";

export type MapObservabilityEventType =
  | "classification"
  | "eligibility"
  | "decision"
  | "wave"
  | "version"
  | "stability";

export type MapObservabilityEvent = {
  eventType: MapObservabilityEventType;
  fieldKey: string;
  formId: string | null;
  timestamp: number;
  payload: Record<string, unknown>;
};

const MAX_BUFFER = 500;
const DEFAULT_DEDUP_WINDOW_MS = 60_000;
const DEFAULT_EVENTS_DIR = "map/observability/events";

let eventBuffer: MapObservabilityEvent[] = [];

function pushToBuffer(events: MapObservabilityEvent[]): void {
  for (const event of events) {
    eventBuffer.push(event);
    if (eventBuffer.length > MAX_BUFFER) {
      eventBuffer.shift();
    }
  }
}

export function getMapObservabilityEventBuffer(): readonly MapObservabilityEvent[] {
  return eventBuffer;
}

export function clearMapObservabilityEventBuffer(): void {
  eventBuffer = [];
}

export function deduplicateMapEvents(
  events: MapObservabilityEvent[],
  windowMs: number = DEFAULT_DEDUP_WINDOW_MS,
): MapObservabilityEvent[] {
  const seen = new Set<string>();
  const result: MapObservabilityEvent[] = [];

  for (const event of events) {
    const window = Math.floor(event.timestamp / windowMs);
    const dedupId =
      event.eventType === "wave" || event.eventType === "stability"
        ? event.fieldKey
        : (event.formId ?? event.fieldKey);
    const key = `${dedupId}:${event.eventType}:${window}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(event);
  }

  return result;
}

export type CollectMapObservabilityEventsOptions = {
  root?: string;
  waves?: number[];
  dedup?: boolean;
  dedupWindowMs?: number;
  updateBuffer?: boolean;
};

export function collectMapObservabilityEvents(
  options?: CollectMapObservabilityEventsOptions,
): MapObservabilityEvent[] {
  const root = options?.root ?? process.cwd();
  const now = Date.now();
  const events: MapObservabilityEvent[] = [];

  const { fields } = scanMigrationInventory({ root });
  const profiles = classifyAllFields(fields, { root });
  const profileByKey = new Map(profiles.map((p) => [p.fieldKey, p]));

  for (const field of fields) {
    const decision = resolveFormUxMigrationDecisionForField(field, { root });
    const formId = field.formId;

    events.push({
      eventType: "classification",
      fieldKey: field.fieldKey,
      formId,
      timestamp: now,
      payload: {
        tier: decision.classification.tier,
        tierBand: decision.classification.tierBand,
        tier0ConfidenceScore: decision.classification.tier0ConfidenceScore,
        mapVersion: decision.classification.mapVersion,
        classifierSchemaVersion: decision.classification.classifierSchemaVersion,
        signals: decision.classification.signals,
      },
    });

    events.push({
      eventType: "eligibility",
      fieldKey: field.fieldKey,
      formId,
      timestamp: now,
      payload: {
        waveEligible: decision.eligibility.waveEligible,
        structurallyMigratable: decision.eligibility.structurallyMigratable,
        eligibilityBlockers: decision.eligibility.eligibilityBlockers,
        driftScore: decision.eligibility.driftScore,
        driftTrend: decision.eligibility.driftTrend,
        tier0bStabilityScore: decision.eligibility.tier0bStabilityScore,
        eligibilitySchemaVersion: decision.eligibility.eligibilitySchemaVersion,
        evaluatedAgainstMapVersion: decision.eligibility.evaluatedAgainstMapVersion,
      },
    });

    events.push({
      eventType: "decision",
      fieldKey: field.fieldKey,
      formId,
      timestamp: now,
      payload: {
        finalDecision: decision.finalDecision,
        compatibilityStatus: decision.compatibilityStatus,
        reasonTrace: decision.reasonTrace,
        mapVersion: decision.mapVersion,
      },
    });
  }

  const waves = buildMigrationWaves(profiles);
  const waveNumbers =
    options?.waves ?? waves.map((w) => w.wave);

  for (const waveNumber of waveNumbers) {
    const plan = buildWaveExecutionPlan(waveNumber, { root });
    const waveBucket = waves.find((w) => w.wave === waveNumber);
    const structuralCount = waveBucket?.fieldCount ?? 0;

    events.push({
      eventType: "wave",
      fieldKey: `wave:${waveNumber}`,
      formId: null,
      timestamp: now,
      payload: {
        wave: waveNumber,
        candidates: plan.manifest.candidates.length,
        excludedCount: plan.manifest.excludedCount,
        driftAdjustedCount: plan.driftAdjustedCandidates.length,
        incompatibleVersionSkips: plan.incompatibleVersionSkips.length,
        structuralCount,
        eligibleCount: plan.manifest.candidates.filter((c) => c.eligible).length,
        recommendation: plan.recommendation,
      },
    });
  }

  for (const versionEvent of getFormUxMapVersionEvents()) {
    events.push({
      eventType: "version",
      fieldKey: versionEvent.fieldKey ?? "unknown",
      formId: versionEvent.fieldKey?.split(".")[0] ?? null,
      timestamp: versionEvent.ts,
      payload: {
        classifierVersion: versionEvent.classifierVersion,
        eligibilityVersion: versionEvent.eligibilityVersion,
        mapVersion: versionEvent.mapVersion,
        compatibilityStatus: versionEvent.compatibilityStatus,
      },
    });
  }

  const driftReport = detectAllTier0BDrift(fields, profiles, { root });
  const stabilityReport = buildTierStabilityReport({ root });

  events.push({
    eventType: "stability",
    fieldKey: "global",
    formId: null,
    timestamp: now,
    payload: {
      tier0bTotal: stabilityReport.tier0bTotal,
      tier0bStable: stabilityReport.tier0bStable,
      tier0bUnstable: stabilityReport.tier0bUnstable,
      tier0bEligibilityExcluded: stabilityReport.tier0bEligibilityExcluded,
      averageDriftScore: driftReport.averageDriftScore,
      unstableCount: driftReport.unstableCount,
      degradingCount: driftReport.degradingCount,
      driftRiskLevel: stabilityReport.driftRiskLevel,
    },
  });

  for (const assessment of driftReport.assessments) {
    const profile = profileByKey.get(assessment.fieldKey);
    events.push({
      eventType: "stability",
      fieldKey: assessment.fieldKey,
      formId: profile?.formId ?? assessment.fieldKey.split(".")[0] ?? null,
      timestamp: now,
      payload: {
        driftScore: assessment.score,
        driftTrend: assessment.trend,
        tierBandChanged: assessment.tierBandChanged,
        contractPenalty: assessment.contractPenalty,
      },
    });
  }

  const deduped =
    options?.dedup === false
      ? events
      : deduplicateMapEvents(events, options?.dedupWindowMs);

  if (options?.updateBuffer !== false) {
    pushToBuffer(deduped);
  }

  return deduped;
}

export function exportMapObservabilityEvents(
  filePath?: string,
  events?: MapObservabilityEvent[],
  options?: { root?: string },
): string {
  const root = options?.root ?? process.cwd();
  const payload = events ?? collectMapObservabilityEvents({ root, updateBuffer: false });
  const dir = path.join(root, DEFAULT_EVENTS_DIR);
  fs.mkdirSync(dir, { recursive: true });

  const iso = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath =
    filePath ?? path.join(dir, `map-events-${iso}.json`);

  fs.writeFileSync(
    outPath,
    JSON.stringify({ exportedAt: new Date().toISOString(), events: payload }, null, 2),
    "utf8",
  );

  return outPath;
}
