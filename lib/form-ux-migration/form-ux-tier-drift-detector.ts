import fs from "node:fs";
import path from "node:path";
import type { FormUxClassificationResult } from "@/lib/form-ux-migration/form-ux-classification-engine";
import type { MigrationInventoryField } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import {
  evaluateTier0BContract,
  TIER0B_DRIFT_STABLE_THRESHOLD,
} from "@/lib/form-ux-migration/form-ux-tier-semantic-contract";

export type ClassifierFieldSnapshot = {
  fieldKey: string;
  tierBand: string;
  signals: string[];
  tier0ConfidenceScore: number;
  capturedAt: string;
};

export type ClassifierSnapshotFile = {
  capturedAt: string;
  fields: ClassifierFieldSnapshot[];
};

export type TierDriftTrend = "stable" | "degrading" | "unstable";

export type TierDriftAssessment = {
  fieldKey: string;
  score: number;
  trend: TierDriftTrend;
  confidenceDelta: number;
  signalDelta: number;
  tierBandChanged: boolean;
  tierBandWorsened: boolean;
  hasPriorSnapshot: boolean;
  contractPenalty: number;
};

export type TierDriftReport = {
  generatedAt: string;
  assessments: TierDriftAssessment[];
  averageDriftScore: number;
  unstableCount: number;
  degradingCount: number;
};

const DEFAULT_SNAPSHOT_DIR = "map/stability/classifier-snapshots";

const TIER_BAND_ORDER: Record<string, number> = {
  "0": 0,
  "0B": 0,
  "1": 1,
  "2": 2,
  "3": 3,
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, Math.round(n * 100) / 100));
}

function symmetricSignalDelta(current: string[], prior: string[]): number {
  const a = new Set(current);
  const b = new Set(prior);
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 0;
  let diff = 0;
  for (const s of union) {
    if (a.has(s) !== b.has(s)) diff += 1;
  }
  return diff / union.size;
}

function tierBandWorsened(current: string, prior: string): boolean {
  return (TIER_BAND_ORDER[current] ?? 99) > (TIER_BAND_ORDER[prior] ?? 99);
}

function listSnapshotFiles(root: string, dir: string): string[] {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(abs, f))
    .sort();
}

export function readClassifierSnapshots(options?: {
  root?: string;
  snapshotDir?: string;
  limit?: number;
}): ClassifierSnapshotFile[] {
  const root = options?.root ?? process.cwd();
  const files = listSnapshotFiles(root, options?.snapshotDir ?? DEFAULT_SNAPSHOT_DIR);
  const limit = options?.limit ?? 10;
  const snapshots: ClassifierSnapshotFile[] = [];
  for (const file of files.slice(-limit)) {
    try {
      snapshots.push(JSON.parse(fs.readFileSync(file, "utf8")) as ClassifierSnapshotFile);
    } catch {
      // skip corrupt
    }
  }
  return snapshots;
}

export function writeClassifierSnapshot(
  profiles: FormUxClassificationResult[],
  options?: { root?: string; snapshotDir?: string },
): string {
  const root = options?.root ?? process.cwd();
  const dir = path.join(root, options?.snapshotDir ?? DEFAULT_SNAPSHOT_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const capturedAt = new Date().toISOString();
  const payload: ClassifierSnapshotFile = {
    capturedAt,
    fields: profiles.map((p) => ({
      fieldKey: p.fieldKey,
      tierBand: p.tierBand,
      signals: [...p.signals],
      tier0ConfidenceScore: p.tier0ConfidenceScore,
      capturedAt,
    })),
  };
  const fileName = `${capturedAt.replace(/[:.]/g, "-")}.json`;
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
  return filePath;
}

function resolveTrend(
  fieldKey: string,
  currentScore: number,
  snapshots: ClassifierSnapshotFile[],
): TierDriftTrend {
  const history = snapshots
    .map((s) => s.fields.find((f) => f.fieldKey === fieldKey))
    .filter((f): f is ClassifierFieldSnapshot => f != null);

  if (history.length < 2) {
    return currentScore < TIER0B_DRIFT_STABLE_THRESHOLD ? "stable" : "degrading";
  }

  const tierBands = history.map((h) => h.tierBand);
  const uniqueBands = new Set(tierBands);
  if (uniqueBands.size >= 3) return "unstable";

  let flips = 0;
  for (let i = 1; i < tierBands.length; i += 1) {
    if (tierBands[i] !== tierBands[i - 1]) flips += 1;
  }
  if (flips >= 2) return "unstable";

  const scores: number[] = [];
  for (let i = 1; i < history.length; i += 1) {
    const prior = history[i - 1]!;
    const current = history[i]!;
    scores.push(
      clamp01(
        0.35 * symmetricSignalDelta(current.signals, prior.signals) +
          (tierBandWorsened(current.tierBand, prior.tierBand) ? 0.5 : 0) +
          0.15 * Math.abs(current.tier0ConfidenceScore - prior.tier0ConfidenceScore),
      ),
    );
  }

  const monotonicUp =
    scores.length >= 2 && scores.every((s, i) => i === 0 || s >= scores[i - 1]!);
  if (monotonicUp && scores[scores.length - 1]! > TIER0B_DRIFT_STABLE_THRESHOLD) {
    return "degrading";
  }

  const latest = history[history.length - 1]!;
  const prev = history[history.length - 2]!;
  if (tierBandWorsened(latest.tierBand, prev.tierBand)) return "degrading";

  return currentScore < TIER0B_DRIFT_STABLE_THRESHOLD ? "stable" : "degrading";
}

export function computeDriftScore(input: {
  current: Pick<FormUxClassificationResult, "signals" | "tierBand" | "tier0ConfidenceScore">;
  prior?: ClassifierFieldSnapshot;
  contractPenalty: number;
}): Omit<TierDriftAssessment, "fieldKey" | "trend"> {
  if (!input.prior) {
    return {
      score: clamp01(input.contractPenalty),
      confidenceDelta: 0,
      signalDelta: 0,
      tierBandChanged: false,
      tierBandWorsened: false,
      hasPriorSnapshot: false,
      contractPenalty: input.contractPenalty,
    };
  }

  const signalDelta = symmetricSignalDelta(
    input.current.signals,
    input.prior.signals,
  );
  const tierBandChanged = input.current.tierBand !== input.prior.tierBand;
  const worsened = tierBandWorsened(input.current.tierBand, input.prior.tierBand);
  const tierChangePenalty = worsened ? 0.5 : tierBandChanged ? 0.25 : 0;
  const confidenceDelta = Math.abs(
    input.current.tier0ConfidenceScore - input.prior.tier0ConfidenceScore,
  );

  const score = clamp01(
    0.35 * signalDelta +
      tierChangePenalty +
      0.15 * confidenceDelta +
      input.contractPenalty,
  );

  return {
    score,
    confidenceDelta,
    signalDelta,
    tierBandChanged,
    tierBandWorsened: worsened,
    hasPriorSnapshot: true,
    contractPenalty: input.contractPenalty,
  };
}

export function detectTier0BDrift(
  field: MigrationInventoryField,
  profile: FormUxClassificationResult,
  options?: { root?: string; context?: string; snapshots?: ClassifierSnapshotFile[] },
): TierDriftAssessment {
  const root = options?.root ?? process.cwd();
  const snapshots =
    options?.snapshots ?? readClassifierSnapshots({ root, limit: 5 });
  const priorSnapshots = snapshots.slice(0, -1);
  const latestPrior =
    priorSnapshots.length > 0
      ? priorSnapshots[priorSnapshots.length - 1]?.fields.find(
          (f) => f.fieldKey === field.fieldKey,
        )
      : snapshots.length > 0
        ? snapshots[snapshots.length - 1]?.fields.find(
            (f) => f.fieldKey === field.fieldKey,
          )
        : undefined;

  const contract = evaluateTier0BContract(field, profile, options?.context ?? "");
  const partial = computeDriftScore({
    current: profile,
    prior: latestPrior,
    contractPenalty: contract.contractPenalty,
  });

  return {
    fieldKey: field.fieldKey,
    ...partial,
    trend: resolveTrend(field.fieldKey, partial.score, snapshots),
  };
}

export function detectAllTier0BDrift(
  fields: MigrationInventoryField[],
  profiles: FormUxClassificationResult[],
  options?: { root?: string },
): TierDriftReport {
  const profileByKey = new Map(profiles.map((p) => [p.fieldKey, p]));
  const assessments: TierDriftAssessment[] = [];

  for (const field of fields) {
    const profile = profileByKey.get(field.fieldKey);
    if (!profile || profile.tierBand !== "0B") continue;
    assessments.push(detectTier0BDrift(field, profile, options));
  }

  const averageDriftScore =
    assessments.length > 0
      ? clamp01(
          assessments.reduce((sum, a) => sum + a.score, 0) / assessments.length,
        )
      : 0;

  return {
    generatedAt: new Date().toISOString(),
    assessments,
    averageDriftScore,
    unstableCount: assessments.filter((a) => a.trend === "unstable").length,
    degradingCount: assessments.filter((a) => a.trend === "degrading").length,
  };
}
